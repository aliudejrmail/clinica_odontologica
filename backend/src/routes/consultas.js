const { z } = require('zod');
const prisma = require('../lib/prisma');
const { resolvePacienteId } = require('../lib/pacienteId');
const { decryptPaciente } = require('../lib/cpfCrypto');

// Validações (paciente_id pode ser number ou UUID; resolvido no handler)
const consultaSchema = z.object({
  paciente_id: z.union([z.number().int().positive(), z.string().min(1)]),
  dentista_id: z.number().int().positive(),
  data_consulta: z.union([z.string().datetime(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  hora_inicio: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora inválida'),
  hora_fim: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  tipo: z.enum(['consulta', 'retorno', 'emergencia']).default('consulta'),
  observacoes: z.string().optional()
});

const procedimentoConsultaSchema = z.object({
  procedimento_id: z.number().int().positive(),
  dente: z.string().max(10).optional(),
  face: z.string().max(10).optional(),
  valor: z.number().positive(),
  desconto: z.number().min(0).max(100).default(0),
  observacoes: z.string().optional()
});

// Schema Prisma usa data_hora; API expõe data_consulta/hora_inicio/hora_fim
function mapConsultaToApi(consulta) {
  const dt = consulta.data_hora ? new Date(consulta.data_hora) : null;
  const data_consulta = dt ? dt.toISOString().slice(0, 10) : null;
  const hora_inicio = dt ? dt.toTimeString().slice(0, 5) : null;
  const duracao = consulta.duracao_minutos || 60;
  const end = dt ? new Date(dt.getTime() + duracao * 60000) : null;
  const hora_fim = end ? end.toTimeString().slice(0, 5) : null;
  const mapped = { ...consulta, data_consulta, hora_inicio, hora_fim };
  if (mapped.paciente) mapped.paciente = decryptPaciente(mapped.paciente);
  return mapped;
}

function buildDataHora(dataConsultaStr, horaInicioStr, duracaoMinutos = 60) {
  const d = new Date(dataConsultaStr.includes('T') ? dataConsultaStr : dataConsultaStr + 'T12:00:00');
  const [h, m] = horaInicioStr.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

async function consultaRoutes(fastify, options) {
  // Listar consultas
  fastify.get('/', {
    schema: {
      tags: ['consultas'],
      summary: 'Listar consultas',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          data_inicio: { type: 'string', format: 'date' },
          data_fim: { type: 'string', format: 'date' },
          paciente_id: { type: 'number' },
          dentista_id: { type: 'number' },
          status: { type: 'string', enum: ['agendada', 'confirmada', 'em_andamento', 'concluida', 'cancelada'] }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            consultas: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  data_consulta: { type: 'string', format: 'date' },
                  hora_inicio: { type: 'string' },
                  hora_fim: { type: 'string' },
                  status: { type: 'string' },
                  tipo: { type: 'string' },
                  valor_total: { type: 'number' },
                  paciente: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      nome: { type: 'string' }
                    }
                  },
                  dentista: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      nome: { type: 'string' }
                    }
                  }
                }
              }
            },
            total: { type: 'number' },
            page: { type: 'number' },
            totalPages: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { page = 1, limit = 20, data_inicio, data_fim, paciente_id, dentista_id, status } = request.query;
    const skip = (page - 1) * limit;

    const where = {
      clinica_id: request.user.clinica_id
    };

    if (request.user.role === 'dentista') {
      where.dentista_id = request.user.id;
    }

    if (data_inicio || data_fim) {
      where.data_hora = {};
      if (data_inicio) where.data_hora.gte = new Date(data_inicio + 'T00:00:00');
      if (data_fim) where.data_hora.lte = new Date(data_fim + 'T23:59:59.999');
    }

    if (paciente_id) {
      const resolved = await resolvePacienteId(
        typeof paciente_id === 'number' ? String(paciente_id) : paciente_id,
        request.user.clinica_id
      );
      if (resolved != null) where.paciente_id = resolved;
    }
    if (dentista_id) where.dentista_id = parseInt(dentista_id);
    if (status) where.status = status;

    const [consultas, total] = await Promise.all([
      prisma.consultas.findMany({
        where,
        include: {
          paciente: {
            select: { id: true, nome: true }
          },
          dentista: {
            select: { id: true, nome: true }
          }
        },
        orderBy: [{ data_hora: 'desc' }],
        skip,
        take: limit
      }),
      prisma.consultas.count({ where })
    ]);

    return {
      consultas: consultas.map(mapConsultaToApi),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  });

  // Buscar consulta por ID
  fastify.get('/:id', {
    schema: {
      tags: ['consultas'],
      summary: 'Buscar consulta por ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            data_consulta: { type: 'string', format: 'date' },
            hora_inicio: { type: 'string' },
            hora_fim: { type: 'string' },
            status: { type: 'string' },
            tipo: { type: 'string' },
            valor_total: { type: 'number' },
            observacoes: { type: 'string' },
            paciente: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                nome: { type: 'string' },
                cpf: { type: 'string' },
                telefone: { type: 'string' }
              }
            },
            dentista: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                nome: { type: 'string' },
                cro: { type: 'string' }
              }
            },
            procedimentos: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  dente: { type: 'string' },
                  face: { type: 'string' },
                  valor: { type: 'number' },
                  desconto: { type: 'number' },
                  observacoes: { type: 'string' },
                  procedimento: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      nome: { type: 'string' },
                      descricao: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;

    const consulta = await prisma.consultas.findFirst({
      where: {
        id: parseInt(id),
        clinica_id: request.user.clinica_id
      },
      include: {
        paciente: {
          select: { id: true, nome: true, cpf: true, telefone: true }
        },
        dentista: {
          select: { id: true, nome: true, cro: true }
        },
        procedimentos: {
          include: {
            procedimento: true
          }
        }
      }
    });

    if (!consulta) {
      return reply.code(404).send({ error: 'Consulta não encontrada' });
    }

    // Verificar permissão para dentistas
    if (request.user.role === 'dentista' && consulta.dentista_id !== request.user.id) {
      return reply.code(403).send({ error: 'Acesso negado' });
    }

    return mapConsultaToApi(consulta);
  });

  // Criar consulta
  fastify.post('/', {
    schema: {
      tags: ['consultas'],
      summary: 'Criar nova consulta',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          paciente_id: { type: 'number' },
          dentista_id: { type: 'number' },
          data_consulta: { type: 'string', format: 'date-time' },
          hora_inicio: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
          hora_fim: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
          tipo: { type: 'string', enum: ['consulta', 'retorno', 'emergencia'] },
          observacoes: { type: 'string' }
        },
        required: ['paciente_id', 'dentista_id', 'data_consulta', 'hora_inicio']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            data_consulta: { type: 'string', format: 'date' },
            hora_inicio: { type: 'string' },
            status: { type: 'string' },
            tipo: { type: 'string' }
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
      const dados = consultaSchema.parse({ ...raw, paciente_id: raw.paciente_id });

      // Verificar se paciente existe e pertence à clínica
      const paciente = await prisma.pacientes.findFirst({
        where: {
          id: pacienteIdResolved,
          clinica_id: request.user.clinica_id
        }
      });

      if (!paciente) {
        return reply.code(404).send({ error: 'Paciente não encontrado' });
      }

      // Verificar se dentista existe e pertence à clínica
      const dentista = await prisma.dentistas.findFirst({
        where: {
          id: dados.dentista_id,
          clinica_id: request.user.clinica_id
        }
      });

      if (!dentista) {
        return reply.code(404).send({ error: 'Dentista não encontrado' });
      }

      const duracaoMinutos = dados.hora_fim
        ? (() => { const [h1, m1] = dados.hora_inicio.split(':').map(Number); const [h2, m2] = dados.hora_fim.split(':').map(Number); return (h2 * 60 + m2) - (h1 * 60 + m1); })()
        : 60;
      const newStart = buildDataHora(dados.data_consulta, dados.hora_inicio, duracaoMinutos);
      const newEnd = new Date(newStart.getTime() + duracaoMinutos * 60000);
      const dayStart = new Date(newStart);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const noMesmoDia = await prisma.consultas.findMany({
        where: {
          dentista_id: dados.dentista_id,
          status: { notIn: ['cancelada', 'concluida'] },
          data_hora: { gte: dayStart, lte: dayEnd }
        }
      });
      const conflito = noMesmoDia.some((c) => {
        const cStart = new Date(c.data_hora).getTime();
        const cEnd = cStart + (c.duracao_minutos || 60) * 60000;
        return newStart.getTime() < cEnd && newEnd.getTime() > cStart;
      });

      if (conflito) {
        return reply.code(409).send({ error: 'Horário indisponível para este odontólogo' });
      }

      const consulta = await prisma.consultas.create({
        data: {
          clinica_id: request.user.clinica_id,
          paciente_id: pacienteIdResolved,
          dentista_id: dados.dentista_id,
          data_hora: newStart,
          duracao_minutos: duracaoMinutos,
          status: 'agendada',
          tipo_consulta: dados.tipo || 'consulta',
          observacoes: dados.observacoes || null
        }
      });

      return reply.code(201).send(mapConsultaToApi(consulta));
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

  // Adicionar procedimento à consulta
  fastify.post('/:id/procedimentos', {
    schema: {
      tags: ['consultas'],
      summary: 'Adicionar procedimento à consulta',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          procedimento_id: { type: 'number' },
          dente: { type: 'string', maxLength: 10 },
          face: { type: 'string', maxLength: 10 },
          valor: { type: 'number' },
          desconto: { type: 'number', minimum: 0, maximum: 100 },
          observacoes: { type: 'string' }
        },
        required: ['procedimento_id', 'valor']
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    
    try {
      const dados = procedimentoConsultaSchema.parse(request.body);

      // Verificar se consulta existe
      const consulta = await prisma.consultas.findFirst({
        where: {
          id: parseInt(id),
          clinica_id: request.user.clinica_id
        }
      });

      if (!consulta) {
        return reply.code(404).send({ error: 'Consulta não encontrada' });
      }

      // Verificar se procedimento existe
      const procedimento = await prisma.procedimentos.findFirst({
        where: {
          id: dados.procedimento_id,
          clinica_id: request.user.clinica_id
        }
      });

      if (!procedimento) {
        return reply.code(404).send({ error: 'Procedimento não encontrado' });
      }

      const procedimentoConsulta = await prisma.consulta_procedimentos.create({
        data: {
          ...dados,
          consulta_id: parseInt(id)
        }
      });

      // Atualizar valor total da consulta
      const procedimentos = await prisma.consulta_procedimentos.findMany({
        where: { consulta_id: parseInt(id) }
      });
      
      const valorTotal = procedimentos.reduce((total, proc) => {
        const valorComDesconto = proc.valor * (1 - (proc.desconto || 0) / 100);
        return total + valorComDesconto;
      }, 0);

      await prisma.consultas.update({
        where: { id: parseInt(id) },
        data: { valor_total: valorTotal }
      });

      return reply.code(201).send(procedimentoConsulta);
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

  // Atualizar status da consulta
  fastify.patch('/:id/status', {
    schema: {
      tags: ['consultas'],
      summary: 'Atualizar status da consulta',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['agendada', 'confirmada', 'em_andamento', 'concluida', 'cancelada'] }
        },
        required: ['status']
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { status } = request.body;

    const consulta = await prisma.consultas.update({
      where: {
        id: parseInt(id),
        clinica_id: request.user.clinica_id
      },
      data: { status }
    });

    return consulta;
  });
}

module.exports = consultaRoutes;