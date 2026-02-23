const { z } = require('zod');
const prisma = require('../lib/prisma');

// Validações
const dentistaSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  cro: z.string().min(3, 'CRO deve ter no mínimo 3 caracteres'),
  especialidade: z.string().optional(),
  telefone: z.string().max(20, 'Telefone muito longo').optional(),
  email: z.string().email('Email inválido').optional()
});

async function dentistaRoutes(fastify, options) {
  // Listar dentistas
  fastify.get('/', {
    schema: {
      tags: ['dentistas'],
      summary: 'Listar dentistas',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          ativo: { type: 'boolean' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            dentistas: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  nome: { type: 'string' },
                  cro: { type: 'string' },
                  especialidade: { type: 'string' },
                  telefone: { type: 'string' },
                  email: { type: 'string' },
                  ativo: { type: 'boolean' },
                  created_at: { type: 'string', format: 'date-time' }
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
    const { page = 1, limit = 20, ativo } = request.query;
    const skip = (page - 1) * limit;

    const where = {
      clinica_id: request.user.clinica_id
    };

    if (ativo !== undefined) {
      where.ativo = ativo;
    }

    const [dentistas, total] = await Promise.all([
      prisma.dentistas.findMany({
        where,
        select: {
          id: true,
          nome: true,
          cro: true,
          especialidade: true,
          telefone: true,
          email: true,
          ativo: true,
          created_at: true
        },
        orderBy: { nome: 'asc' },
        skip,
        take: limit
      }),
      prisma.dentistas.count({ where })
    ]);

    return {
      dentistas,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  });

  // Buscar dentista por ID
  fastify.get('/:id', {
    schema: {
      tags: ['dentistas'],
      summary: 'Buscar dentista por ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;

    const dentista = await prisma.dentistas.findFirst({
      where: {
        id: parseInt(id),
        clinica_id: request.user.clinica_id
      }
    });

    if (!dentista) {
      return reply.code(404).send({ error: 'Dentista não encontrado' });
    }

    return dentista;
  });

  // Criar dentista
  fastify.post('/', {
    schema: {
      tags: ['dentistas'],
      summary: 'Criar novo dentista',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          nome: { type: 'string', minLength: 3 },
          cro: { type: 'string', minLength: 3 },
          especialidade: { type: 'string' },
          telefone: { type: 'string', maxLength: 20 },
          email: { type: 'string', format: 'email' }
        },
        required: ['nome', 'cro']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            nome: { type: 'string' },
            cro: { type: 'string' },
            especialidade: { type: 'string' },
            telefone: { type: 'string' },
            email: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const dados = dentistaSchema.parse(request.body);

      // Verificar se CRO já existe
      const dentistaExistente = await prisma.dentistas.findFirst({
        where: { cro: dados.cro }
      });

      if (dentistaExistente) {
        return reply.code(409).send({ error: 'CRO já cadastrado' });
      }

      const dentista = await prisma.dentistas.create({
        data: {
          ...dados,
          clinica_id: request.user.clinica_id
        }
      });

      return reply.code(201).send(dentista);
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

  // Atualizar dentista
  fastify.put('/:id', {
    schema: {
      tags: ['dentistas'],
      summary: 'Atualizar dentista',
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
          nome: { type: 'string', minLength: 3 },
          cro: { type: 'string', minLength: 3 },
          especialidade: { type: 'string' },
          telefone: { type: 'string', maxLength: 20 },
          email: { type: 'string', format: 'email' },
          ativo: { type: 'boolean' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    
    try {
      const dados = dentistaSchema.partial().parse(request.body);

      const dentista = await prisma.dentistas.update({
        where: {
          id: parseInt(id),
          clinica_id: request.user.clinica_id
        },
        data: dados
      });

      return dentista;
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

  // Buscar disponibilidade do dentista
  fastify.get('/:id/disponibilidade', {
    schema: {
      tags: ['dentistas'],
      summary: 'Buscar disponibilidade do dentista',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          data: { type: 'string', format: 'date' }
        },
        required: ['data']
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { data } = request.query;

    const dentista = await prisma.dentistas.findFirst({
      where: {
        id: parseInt(id),
        clinica_id: request.user.clinica_id
      }
    });

    if (!dentista) {
      return reply.code(404).send({ error: 'Dentista não encontrado' });
    }

    // Buscar consultas do dia
    const consultas = await prisma.consultas.findMany({
      where: {
        dentista_id: parseInt(id),
        data_consulta: new Date(data),
        status: {
          notIn: ['cancelada']
        }
      },
      select: {
        hora_inicio: true,
        hora_fim: true,
        status: true
      },
      orderBy: { hora_inicio: 'asc' }
    });

    // Gerar horários disponíveis (8h às 18h, intervalo de 30 min)
    const horariosDisponiveis = [];
    const horaInicio = 8;
    const horaFim = 18;
    
    for (let hora = horaInicio; hora < horaFim; hora++) {
      for (let minuto = 0; minuto < 60; minuto += 30) {
        const horario = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
        
        // Verificar se horário está ocupado
        const ocupado = consultas.some(consulta => {
          const [horaConsulta, minConsulta] = consulta.hora_inicio.split(':').map(Number);
          const [horaFimConsulta, minFimConsulta] = (consulta.hora_fim || `${horaConsulta + 1}:${minConsulta}`).split(':').map(Number);
          
          const inicioConsulta = horaConsulta * 60 + minConsulta;
          const fimConsulta = horaFimConsulta * 60 + minFimConsulta;
          const horarioAtual = hora * 60 + minuto;
          
          return horarioAtual >= inicioConsulta && horarioAtual < fimConsulta;
        });
        
        if (!ocupado) {
          horariosDisponiveis.push(horario);
        }
      }
    }

    return {
      dentista: {
        id: dentista.id,
        nome: dentista.nome,
        especialidade: dentista.especialidade
      },
      data,
      horarios_disponiveis: horariosDisponiveis,
      horarios_ocupados: consultas.map(c => ({
        hora_inicio: c.hora_inicio,
        hora_fim: c.hora_fim,
        status: c.status
      }))
    };
  });
}

module.exports = dentistaRoutes;