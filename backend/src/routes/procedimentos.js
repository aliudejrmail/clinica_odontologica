const { z } = require('zod');
const prisma = require('../lib/prisma');

// Validações
const procedimentoSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  descricao: z.string().optional(),
  valor: z.number().positive('Valor deve ser positivo'),
  duracao_minutos: z.number().int().positive('Duração deve ser positiva'),
  ativo: z.boolean().optional()
});

async function procedimentoRoutes(fastify, options) {
  // Listar procedimentos
  fastify.get('/', {
    schema: {
      tags: ['procedimentos'],
      summary: 'Listar procedimentos',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          ativo: { type: 'boolean' },
          search: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            procedimentos: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  nome: { type: 'string' },
                  descricao: { type: 'string' },
                  valor: { type: 'number' },
                  duracao_minutos: { type: 'number' },
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
    const { page = 1, limit = 20, ativo, search } = request.query;
    const skip = (page - 1) * limit;

    const where = {
      clinica_id: request.user.clinica_id
    };

    if (ativo !== undefined) {
      where.ativo = ativo;
    }

    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { descricao: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [procedimentos, total] = await Promise.all([
      prisma.procedimentos.findMany({
        where,
        select: {
          id: true,
          nome: true,
          descricao: true,
          valor: true,
          duracao_minutos: true,
          ativo: true,
          created_at: true
        },
        orderBy: { nome: 'asc' },
        skip,
        take: limit
      }),
      prisma.procedimentos.count({ where })
    ]);

    return {
      procedimentos,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  });

  // Buscar procedimento por ID
  fastify.get('/:id', {
    schema: {
      tags: ['procedimentos'],
      summary: 'Buscar procedimento por ID',
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

    const procedimento = await prisma.procedimentos.findFirst({
      where: {
        id: parseInt(id),
        clinica_id: request.user.clinica_id
      }
    });

    if (!procedimento) {
      return reply.code(404).send({ error: 'Procedimento não encontrado' });
    }

    return procedimento;
  });

  // Criar procedimento
  fastify.post('/', {
    schema: {
      tags: ['procedimentos'],
      summary: 'Criar novo procedimento',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          nome: { type: 'string', minLength: 3 },
          descricao: { type: 'string' },
          valor: { type: 'number', minimum: 0.01 },
          duracao_minutos: { type: 'number', minimum: 1 },
          ativo: { type: 'boolean' }
        },
        required: ['nome', 'valor', 'duracao_minutos']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            nome: { type: 'string' },
            descricao: { type: 'string' },
            valor: { type: 'number' },
            duracao_minutos: { type: 'number' },
            ativo: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const dados = procedimentoSchema.parse(request.body);

      const procedimento = await prisma.procedimentos.create({
        data: {
          ...dados,
          clinica_id: request.user.clinica_id
        }
      });

      return reply.code(201).send(procedimento);
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

  // Atualizar procedimento
  fastify.put('/:id', {
    schema: {
      tags: ['procedimentos'],
      summary: 'Atualizar procedimento',
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
          descricao: { type: 'string' },
          valor: { type: 'number', minimum: 0.01 },
          duracao_minutos: { type: 'number', minimum: 1 },
          ativo: { type: 'boolean' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    
    try {
      const dados = procedimentoSchema.partial().parse(request.body);

      const procedimento = await prisma.procedimentos.update({
        where: {
          id: parseInt(id),
          clinica_id: request.user.clinica_id
        },
        data: dados
      });

      return procedimento;
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

  // Ativar/desativar procedimento
  fastify.patch('/:id/toggle', {
    schema: {
      tags: ['procedimentos'],
      summary: 'Ativar/desativar procedimento',
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

    const procedimento = await prisma.procedimentos.findFirst({
      where: {
        id: parseInt(id),
        clinica_id: request.user.clinica_id
      }
    });

    if (!procedimento) {
      return reply.code(404).send({ error: 'Procedimento não encontrado' });
    }

    const procedimentoAtualizado = await prisma.procedimentos.update({
      where: { id: parseInt(id) },
      data: { ativo: !procedimento.ativo }
    });

    return {
      id: procedimentoAtualizado.id,
      nome: procedimentoAtualizado.nome,
      ativo: procedimentoAtualizado.ativo
    };
  });

  // Buscar procedimentos mais utilizados
  fastify.get('/estatisticas/mais-utilizados', {
    schema: {
      tags: ['procedimentos'],
      summary: 'Procedimentos mais utilizados',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          data_inicio: { type: 'string', format: 'date' },
          data_fim: { type: 'string', format: 'date' },
          limit: { type: 'number', minimum: 1, maximum: 50, default: 10 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            procedimentos: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  nome: { type: 'string' },
                  quantidade: { type: 'number' },
                  valor_total: { type: 'number' }
                }
              }
            },
            total_geral: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { data_inicio, data_fim, limit = 10 } = request.query;
    
    const dataInicio = data_inicio ? new Date(data_inicio) : new Date(new Date().getFullYear(), 0, 1);
    const dataFim = data_fim ? new Date(data_fim) : new Date(new Date().getFullYear(), 11, 31);

    const procedimentos = await prisma.$queryRaw`
      SELECT 
        p.id,
        p.nome,
        COUNT(cp.id) as quantidade,
        SUM(p.valor) as valor_total
      FROM procedimentos p
      JOIN consulta_procedimentos cp ON p.id = cp.procedimento_id
      JOIN consultas c ON cp.consulta_id = c.id
      WHERE p.clinica_id = ${request.user.clinica_id}
        AND c.data_consulta >= ${dataInicio}
        AND c.data_consulta <= ${dataFim}
      GROUP BY p.id, p.nome
      ORDER BY quantidade DESC
      LIMIT ${limit}
    `;

    const totalGeral = await prisma.$queryRaw`
      SELECT COUNT(*) as total
      FROM procedimentos p
      JOIN consulta_procedimentos cp ON p.id = cp.procedimento_id
      JOIN consultas c ON cp.consulta_id = c.id
      WHERE p.clinica_id = ${request.user.clinica_id}
        AND c.data_consulta >= ${dataInicio}
        AND c.data_consulta <= ${dataFim}
    `;

    return {
      procedimentos,
      total_geral: totalGeral[0].total
    };
  });
}

module.exports = procedimentoRoutes;