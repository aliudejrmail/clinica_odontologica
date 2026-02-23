const { z } = require('zod');
const prisma = require('../lib/prisma');
const { resolvePacienteId } = require('../lib/pacienteId');
const { decryptPaciente } = require('../lib/cpfCrypto');

// Validações (paciente_id no body pode ser number ou string UUID; resolvido no handler)
const odontogramaSchema = z.object({
  paciente_id: z.union([z.number().int().positive(), z.string().min(1)]),
  dente_num: z.string().regex(/^([1-8][1-8]|[1-5]1)$/, 'Dente inválido (use formato ISO 3950, ex: 11, 12, 21, 31)'),
  estado: z.enum(['sadio', 'cariado', 'obturado', 'ausente', 'extraido', 'implante', 'coroa', 'ponte', 'tratamento']),
  faces: z.object({
    mesial: z.enum(['sadio', 'cariado', 'obturado']).optional(),
    distal: z.enum(['sadio', 'cariado', 'obturado']).optional(),
    vestibular: z.enum(['sadio', 'cariado', 'obturado']).optional(),
    lingual: z.enum(['sadio', 'cariado', 'obturado']).optional(),
    oclusal: z.enum(['sadio', 'cariado', 'obturado']).optional()
  }).optional(),
  observacoes: z.string().optional()
});

async function odontogramaRoutes(fastify, options) {
  // Buscar odontograma completo do paciente
  fastify.get('/paciente/:paciente_id', {
    schema: {
      tags: ['odontograma'],
      summary: 'Buscar odontograma completo do paciente (ID ou UUID)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          paciente_id: { type: 'string' }
        },
        required: ['paciente_id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            paciente: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                nome: { type: 'string' },
                cpf: { type: 'string' }
              }
            },
            dentes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  dente_num: { type: 'string' },
                  estado: { type: 'string' },
                  faces: { type: 'object' },
                  observacoes: { type: 'string' },
                  data_registro: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { paciente_id } = request.params;
    const pacienteId = await resolvePacienteId(paciente_id, request.user.clinica_id);
    if (pacienteId == null) {
      return reply.code(404).send({ error: 'Paciente não encontrado' });
    }

    const paciente = await prisma.pacientes.findFirst({
      where: { id: pacienteId, clinica_id: request.user.clinica_id }
    });

    if (!paciente) {
      return reply.code(404).send({ error: 'Paciente não encontrado' });
    }

    const dentes = await prisma.odontogramas.findMany({
      where: {
        paciente_id: pacienteId,
        clinica_id: request.user.clinica_id
      },
      orderBy: { dente_num: 'asc' }
    });

    return {
      paciente: decryptPaciente({
        id: paciente.id,
        uuid: paciente.uuid,
        nome: paciente.nome,
        cpf: paciente.cpf
      }),
      dentes
    };
  });

  // Buscar estado de um dente específico
  fastify.get('/paciente/:paciente_id/dente/:dente_num', {
    schema: {
      tags: ['odontograma'],
      summary: 'Buscar estado de um dente específico',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          paciente_id: { type: 'string' },
          dente_num: { type: 'string' }
        },
        required: ['paciente_id', 'dente_num']
      }
    }
  }, async (request, reply) => {
    const { paciente_id, dente_num } = request.params;
    const pacienteId = await resolvePacienteId(paciente_id, request.user.clinica_id);
    if (pacienteId == null) {
      return reply.code(404).send({ error: 'Paciente não encontrado' });
    }

    const dente = await prisma.odontogramas.findFirst({
      where: {
        paciente_id: pacienteId,
        dente_num,
        clinica_id: request.user.clinica_id
      }
    });

    if (!dente) {
      return reply.code(404).send({ error: 'Registro do dente não encontrado' });
    }

    return dente;
  });

  // Registrar/Atualizar estado de um dente
  fastify.post('/', {
    schema: {
      tags: ['odontograma'],
      summary: 'Registrar estado de um dente',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          paciente_id: { type: 'number' },
          dente_num: { type: 'string', pattern: '^([1-8][1-8]|[1-5]1)$' },
          estado: { type: 'string', enum: ['sadio', 'cariado', 'obturado', 'ausente', 'extraido', 'implante', 'coroa', 'ponte', 'tratamento'] },
          faces: {
            type: 'object',
            properties: {
              mesial: { type: 'string', enum: ['sadio', 'cariado', 'obturado'] },
              distal: { type: 'string', enum: ['sadio', 'cariado', 'obturado'] },
              vestibular: { type: 'string', enum: ['sadio', 'cariado', 'obturado'] },
              lingual: { type: 'string', enum: ['sadio', 'cariado', 'obturado'] },
              oclusal: { type: 'string', enum: ['sadio', 'cariado', 'obturado'] }
            }
          },
          observacoes: { type: 'string' }
        },
        required: ['paciente_id', 'dente_num', 'estado']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            dente_num: { type: 'string' },
            estado: { type: 'string' },
            faces: { type: 'object' },
            observacoes: { type: 'string' },
            data_registro: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const raw = request.body;
      const pacienteIdResolved = await resolvePacienteId(
        typeof raw.paciente_id === 'number' ? String(raw.paciente_id) : raw.paciente_id,
        request.user.clinica_id
      );
      if (pacienteIdResolved == null) {
        return reply.code(404).send({ error: 'Paciente não encontrado' });
      }
      const dados = odontogramaSchema.parse({ ...raw, paciente_id: raw.paciente_id });

      // Verificar se paciente existe
      const paciente = await prisma.pacientes.findFirst({
        where: {
          id: pacienteIdResolved,
          clinica_id: request.user.clinica_id
        }
      });

      if (!paciente) {
        return reply.code(404).send({ error: 'Paciente não encontrado' });
      }

      // Verificar se já existe registro para este dente
      const denteExistente = await prisma.odontogramas.findFirst({
        where: {
          paciente_id: pacienteIdResolved,
          dente_num: dados.dente_num,
          clinica_id: request.user.clinica_id
        }
      });

      let dente;

      if (denteExistente) {
        // Atualizar registro existente
        dente = await prisma.odontogramas.update({
          where: { id: denteExistente.id },
          data: {
            estado: dados.estado,
            faces: dados.faces || null,
            observacoes: dados.observacoes,
            criado_por: request.user.id,
            data_registro: new Date()
          }
        });
      } else {
        // Criar novo registro
        dente = await prisma.odontogramas.create({
          data: {
            clinica_id: request.user.clinica_id,
            paciente_id: pacienteIdResolved,
            dente_num: dados.dente_num,
            estado: dados.estado,
            faces: dados.faces || null,
            observacoes: dados.observacoes,
            criado_por: request.user.id,
            data_registro: new Date()
          }
        });
      }

      return reply.code(201).send(dente);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ 
          error: 'Dados inválidos', 
          details: error.errors 
        });
      }
      throw error;
    }
  });

  // Registrar múltiplos dentes de uma vez (odontograma completo)
  fastify.post('/bulk', {
    schema: {
      tags: ['odontograma'],
      summary: 'Registrar múltiplos dentes (odontograma completo)',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          paciente_id: { type: ['number', 'string'] },
          dentes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                dente_num: { type: 'string' },
                estado: { type: 'string' },
                faces: { type: 'object' },
                observacoes: { type: 'string' }
              },
              required: ['dente_num', 'estado']
            }
          }
        },
        required: ['paciente_id', 'dentes']
      }
    }
  }, async (request, reply) => {
    const rawPacienteId = request.body.paciente_id;
    const pacienteId = await resolvePacienteId(
      typeof rawPacienteId === 'number' ? String(rawPacienteId) : rawPacienteId,
      request.user.clinica_id
    );
    if (pacienteId == null) {
      return reply.code(404).send({ error: 'Paciente não encontrado' });
    }

    const { dentes } = request.body;

    const paciente = await prisma.pacientes.findFirst({
      where: {
        id: pacienteId,
        clinica_id: request.user.clinica_id
      }
    });

    if (!paciente) {
      return reply.code(404).send({ error: 'Paciente não encontrado' });
    }

    const resultados = [];

    for (const denteData of dentes) {
      try {
        // Validar dente individualmente
        const denteValidado = odontogramaSchema.parse({
          paciente_id: pacienteId,
          dente_num: denteData.dente_num,
          estado: denteData.estado,
          faces: denteData.faces,
          observacoes: denteData.observacoes
        });

        // Verificar se já existe
        const denteExistente = await prisma.odontogramas.findFirst({
          where: {
            paciente_id: pacienteId,
            dente_num: denteValidado.dente_num,
            clinica_id: request.user.clinica_id
          }
        });

        let resultado;
        if (denteExistente) {
          resultado = await prisma.odontogramas.update({
            where: { id: denteExistente.id },
            data: {
              estado: denteValidado.estado,
              faces: denteValidado.faces || null,
              observacoes: denteValidado.observacoes,
              criado_por: request.user.id,
              data_registro: new Date()
            }
          });
        } else {
          resultado = await prisma.odontogramas.create({
            data: {
              clinica_id: request.user.clinica_id,
              paciente_id: pacienteId,
              dente_num: denteValidado.dente_num,
              estado: denteValidado.estado,
              faces: denteValidado.faces || null,
              observacoes: denteValidado.observacoes,
              criado_por: request.user.id,
              data_registro: new Date()
            }
          });
        }

        resultados.push(resultado);
      } catch (error) {
        resultados.push({
          dente_num: denteData.dente_num,
          erro: error.message
        });
      }
    }

    return reply.code(201).send({
      mensagem: 'Odontograma atualizado com sucesso',
      total: resultados.length,
      resultados
    });
  });

  // Obter estatísticas do odontograma
  fastify.get('/paciente/:paciente_id/estatisticas', {
    schema: {
      tags: ['odontograma'],
      summary: 'Obter estatísticas do odontograma',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          paciente_id: { type: 'string' }
        },
        required: ['paciente_id']
      }
    }
  }, async (request, reply) => {
    const { paciente_id } = request.params;
    const pacienteId = await resolvePacienteId(paciente_id, request.user.clinica_id);
    if (pacienteId == null) {
      return reply.code(404).send({ error: 'Paciente não encontrado' });
    }

    const paciente = await prisma.pacientes.findFirst({
      where: {
        id: pacienteId,
        clinica_id: request.user.clinica_id
      }
    });

    if (!paciente) {
      return reply.code(404).send({ error: 'Paciente não encontrado' });
    }

    const estatisticas = await prisma.odontogramas.groupBy({
      by: ['estado'],
      where: {
        paciente_id: pacienteId,
        clinica_id: request.user.clinica_id
      },
      _count: {
        estado: true
      }
    });

    const totalDentes = await prisma.odontogramas.count({
      where: {
        paciente_id: pacienteId,
        clinica_id: request.user.clinica_id
      }
    });

    return {
      total_dentes: totalDentes,
      estatisticas: estatisticas.map(stat => ({
        estado: stat.estado,
        quantidade: stat._count.estado
      }))
    };
  });
}

module.exports = odontogramaRoutes;