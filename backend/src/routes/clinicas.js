const { z } = require('zod');
const prisma = require('../lib/prisma');

// Validações
const clinicaSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  cnpj: z.string().regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos').optional(),
  telefone: z.string().max(20, 'Telefone muito longo').optional(),
  endereco: z.string().optional()
});

async function clinicaRoutes(fastify, options) {
  // Listar clínicas (apenas admin)
  fastify.get('/', {
    schema: {
      tags: ['clinicas'],
      summary: 'Listar clínicas',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            clinicas: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  nome: { type: 'string' },
                  cnpj: { type: 'string' },
                  telefone: { type: 'string' },
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
    },
    preHandler: async (request, reply) => {
      if (request.user.role !== 'clinica_admin') {
        return reply.code(403).send({ error: 'Apenas administradores podem listar clínicas' });
      }
    }
  }, async (request, reply) => {
    const { page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;

    const [clinicas, total] = await Promise.all([
      prisma.clinicas.findMany({
        select: {
          id: true,
          nome: true,
          cnpj: true,
          telefone: true,
          created_at: true
        },
        orderBy: { nome: 'asc' },
        skip,
        take: limit
      }),
      prisma.clinicas.count()
    ]);

    return {
      clinicas,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  });

  // Buscar clínica por ID
  fastify.get('/:id', {
    schema: {
      tags: ['clinicas'],
      summary: 'Buscar clínica por ID',
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

    // Usuários só podem ver sua própria clínica
    if (request.user.role !== 'clinica_admin' && parseInt(id) !== request.user.clinica_id) {
      return reply.code(403).send({ error: 'Acesso negado' });
    }

    const clinica = await prisma.clinicas.findUnique({
      where: { id: parseInt(id) }
    });

    if (!clinica) {
      return reply.code(404).send({ error: 'Clínica não encontrada' });
    }

    return clinica;
  });

  // Criar clínica (apenas admin)
  fastify.post('/', {
    schema: {
      tags: ['clinicas'],
      summary: 'Criar nova clínica',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          nome: { type: 'string', minLength: 3 },
          cnpj: { type: 'string', pattern: '^\\d{14}$' },
          telefone: { type: 'string', maxLength: 20 },
          endereco: { type: 'string' }
        },
        required: ['nome']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            nome: { type: 'string' },
            cnpj: { type: 'string' },
            telefone: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    preHandler: async (request, reply) => {
      if (request.user.role !== 'clinica_admin') {
        return reply.code(403).send({ error: 'Apenas administradores podem criar clínicas' });
      }
    }
  }, async (request, reply) => {
    try {
      const dados = clinicaSchema.parse(request.body);

      const clinica = await prisma.clinicas.create({
        data: dados
      });

      return reply.code(201).send(clinica);
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

  // Atualizar clínica
  fastify.put('/:id', {
    schema: {
      tags: ['clinicas'],
      summary: 'Atualizar clínica',
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
          cnpj: { type: 'string', pattern: '^\\d{14}$' },
          telefone: { type: 'string', maxLength: 20 },
          endereco: { type: 'string' }
        }
      }
    },
    preHandler: async (request, reply) => {
      if (request.user.role !== 'clinica_admin') {
        return reply.code(403).send({ error: 'Apenas administradores podem atualizar clínicas' });
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    
    try {
      const dados = clinicaSchema.partial().parse(request.body);

      const clinica = await prisma.clinicas.update({
        where: { id: parseInt(id) },
        data: dados
      });

      return clinica;
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
}

module.exports = clinicaRoutes;