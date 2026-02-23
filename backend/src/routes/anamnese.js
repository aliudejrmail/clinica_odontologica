const { z } = require('zod');
const prisma = require('../lib/prisma');
const { resolvePacienteId } = require('../lib/pacienteId');

const perguntaSchema = z.object({
  pergunta: z.string().min(1).max(500),
  tipo: z.enum(['texto', 'sim_nao', 'data']).default('texto'),
  ordem: z.number().int().min(0).optional()
});

const respostasSchema = z.object({
  respostas: z.array(z.object({
    pergunta_id: z.number().int().positive(),
    valor: z.string().nullable().optional()
  }))
});

async function anamneseRoutes(fastify) {
  // Listar perguntas da clínica (incluir_inativas=true para tela de configuração)
  fastify.get('/perguntas', {
    schema: {
      tags: ['anamnese'],
      summary: 'Listar perguntas de anamnese da clínica',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          incluir_inativas: { type: 'string', enum: ['true', '1'] }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            perguntas: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  ordem: { type: 'number' },
                  pergunta: { type: 'string' },
                  tipo: { type: 'string' },
                  ativo: { type: 'boolean' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request) => {
    const incluirInativas = request.query.incluir_inativas === 'true' || request.query.incluir_inativas === '1';
    const where = { clinica_id: request.user.clinica_id };
    if (!incluirInativas) where.ativo = true;

    const perguntas = await prisma.anamnese_perguntas.findMany({
      where,
      orderBy: [{ ordem: 'asc' }, { id: 'asc' }],
      select: { id: true, ordem: true, pergunta: true, tipo: true, ativo: true }
    });
    return { perguntas };
  });

  // Criar pergunta (opcional - para configurar perguntas padrão)
  fastify.post('/perguntas', {
    schema: {
      tags: ['anamnese'],
      summary: 'Criar pergunta de anamnese',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          pergunta: { type: 'string' },
          tipo: { type: 'string', enum: ['texto', 'sim_nao', 'data'] },
          ordem: { type: 'number' }
        },
        required: ['pergunta']
      },
      response: { 201: { type: 'object', properties: { id: { type: 'number' }, pergunta: { type: 'string' }, tipo: { type: 'string' } } } }
    }
  }, async (request, reply) => {
    const data = perguntaSchema.parse(request.body);
    const maxOrdem = await prisma.anamnese_perguntas.aggregate({
      where: { clinica_id: request.user.clinica_id },
      _max: { ordem: true }
    });
    const created = await prisma.anamnese_perguntas.create({
      data: {
        clinica_id: request.user.clinica_id,
        pergunta: data.pergunta,
        tipo: data.tipo,
        ordem: data.ordem ?? (maxOrdem._max.ordem ?? 0) + 1
      }
    });
    return reply.code(201).send(created);
  });

  // Atualizar pergunta
  fastify.put('/perguntas/:id', {
    schema: {
      tags: ['anamnese'],
      summary: 'Atualizar pergunta de anamnese',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] },
      body: {
        type: 'object',
        properties: {
          pergunta: { type: 'string' },
          tipo: { type: 'string', enum: ['texto', 'sim_nao', 'data'] },
          ordem: { type: 'number' },
          ativo: { type: 'boolean' }
        }
      },
      response: { 200: { type: 'object' } }
    }
  }, async (request, reply) => {
    const id = parseInt(request.params.id);
    const existing = await prisma.anamnese_perguntas.findFirst({
      where: { id, clinica_id: request.user.clinica_id }
    });
    if (!existing) return reply.code(404).send({ error: 'Pergunta não encontrada' });

    const data = request.body;
    const update = {};
    if (data.pergunta != null) update.pergunta = data.pergunta;
    if (data.tipo != null) update.tipo = data.tipo;
    if (data.ordem != null) update.ordem = data.ordem;
    if (data.ativo !== undefined) update.ativo = data.ativo;

    const updated = await prisma.anamnese_perguntas.update({
      where: { id },
      data: update
    });
    return updated;
  });

  // Excluir pergunta (soft delete: ativo = false)
  fastify.delete('/perguntas/:id', {
    schema: {
      tags: ['anamnese'],
      summary: 'Desativar pergunta de anamnese',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] },
      response: { 200: { type: 'object', properties: { ok: { type: 'boolean' } } } }
    }
  }, async (request, reply) => {
    const id = parseInt(request.params.id);
    const existing = await prisma.anamnese_perguntas.findFirst({
      where: { id, clinica_id: request.user.clinica_id }
    });
    if (!existing) return reply.code(404).send({ error: 'Pergunta não encontrada' });

    await prisma.anamnese_perguntas.update({
      where: { id },
      data: { ativo: false }
    });
    return { ok: true };
  });

  // Obter anamnese do paciente (perguntas + respostas)
  fastify.get('/paciente/:pacienteId', {
    schema: {
      tags: ['anamnese'],
      summary: 'Obter anamnese do paciente',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { pacienteId: { type: 'string' } }, required: ['pacienteId'] },
      response: {
        200: {
          type: 'object',
          properties: {
            perguntas: { type: 'array', items: { type: 'object' } },
            respostas: { type: 'object', additionalProperties: true }
          }
        }
      }
    }
  }, async (request, reply) => {
    const pacienteId = await resolvePacienteId(request.params.pacienteId, request.user.clinica_id);
    if (pacienteId == null) return reply.code(404).send({ error: 'Paciente não encontrado' });

    const [perguntas, respostasList] = await Promise.all([
      prisma.anamnese_perguntas.findMany({
        where: { clinica_id: request.user.clinica_id, ativo: true },
        orderBy: [{ ordem: 'asc' }, { id: 'asc' }],
        select: { id: true, ordem: true, pergunta: true, tipo: true }
      }),
      prisma.anamnese_respostas.findMany({
        where: { paciente_id: pacienteId },
        select: { pergunta_id: true, valor: true }
      })
    ]);

    const respostas = {};
    respostasList.forEach((r) => { respostas[r.pergunta_id] = r.valor; });

    return { perguntas, respostas };
  });

  // Salvar anamnese do paciente
  fastify.put('/paciente/:pacienteId', {
    schema: {
      tags: ['anamnese'],
      summary: 'Salvar anamnese do paciente',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { pacienteId: { type: 'string' } }, required: ['pacienteId'] },
      body: {
        type: 'object',
        properties: {
          respostas: {
            type: 'array',
            items: {
              type: 'object',
              properties: { pergunta_id: { type: 'number' }, valor: { type: ['string', 'null'] } },
              required: ['pergunta_id']
            }
          }
        },
        required: ['respostas']
      },
      response: { 200: { type: 'object', properties: { ok: { type: 'boolean' } } } }
    }
  }, async (request, reply) => {
    const pacienteId = await resolvePacienteId(request.params.pacienteId, request.user.clinica_id);
    if (pacienteId == null) return reply.code(404).send({ error: 'Paciente não encontrado' });

    const { respostas: respostasPayload } = respostasSchema.parse(request.body);

    for (const { pergunta_id, valor } of respostasPayload) {
      const pergunta = await prisma.anamnese_perguntas.findFirst({
        where: { id: pergunta_id, clinica_id: request.user.clinica_id }
      });
      if (!pergunta) continue;

      await prisma.anamnese_respostas.upsert({
        where: {
          paciente_id_pergunta_id: { paciente_id: pacienteId, pergunta_id }
        },
        create: { paciente_id: pacienteId, pergunta_id, valor: valor ?? null },
        update: { valor: valor ?? null, updated_at: new Date() }
      });
    }

    return { ok: true };
  });
}

module.exports = anamneseRoutes;
