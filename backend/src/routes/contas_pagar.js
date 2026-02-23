const { z } = require('zod');
const prisma = require('../lib/prisma');

const createSchema = z.object({
  descricao: z.string().min(1).max(255),
  valor: z.number().positive(),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  observacoes: z.string().optional()
});

const updateSchema = z.object({
  descricao: z.string().min(1).max(255).optional(),
  valor: z.number().positive().optional(),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['pendente', 'pago', 'cancelado']).optional(),
  pago_em: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  observacoes: z.string().nullable().optional()
});

async function contasPagarRoutes(fastify) {
  fastify.get('/', {
    schema: {
      tags: ['contas_pagar'],
      summary: 'Listar contas a pagar',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          status: { type: 'string', enum: ['pendente', 'pago', 'cancelado'] },
          data_inicio: { type: 'string', format: 'date' },
          data_fim: { type: 'string', format: 'date' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            contas: { type: 'array', items: { type: 'object' } },
            total: { type: 'number' },
            page: { type: 'number' },
            totalPages: { type: 'number' }
          }
        }
      }
    }
  }, async (request) => {
    const { page = 1, limit = 20, status, data_inicio, data_fim } = request.query;
    const skip = (page - 1) * limit;
    const where = { clinica_id: request.user.clinica_id };
    if (status) where.status = status;
    if (data_inicio || data_fim) {
      where.vencimento = {};
      if (data_inicio) where.vencimento.gte = new Date(data_inicio);
      if (data_fim) where.vencimento.lte = new Date(data_fim + 'T23:59:59.999');
    }
    const [contas, total] = await Promise.all([
      prisma.contas_pagar.findMany({
        where,
        orderBy: [{ vencimento: 'asc' }],
        skip,
        take: limit
      }),
      prisma.contas_pagar.count({ where })
    ]);
    return { contas, total, page, totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/:id', {
    schema: {
      tags: ['contas_pagar'],
      summary: 'Buscar conta por ID',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] },
      response: { 200: { type: 'object' } }
    }
  }, async (request, reply) => {
    const id = parseInt(request.params.id);
    const conta = await prisma.contas_pagar.findFirst({
      where: { id, clinica_id: request.user.clinica_id }
    });
    if (!conta) return reply.code(404).send({ error: 'Conta não encontrada' });
    return conta;
  });

  fastify.post('/', {
    schema: {
      tags: ['contas_pagar'],
      summary: 'Criar conta a pagar',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          descricao: { type: 'string' },
          valor: { type: 'number' },
          vencimento: { type: 'string', format: 'date' },
          observacoes: { type: 'string' }
        },
        required: ['descricao', 'valor', 'vencimento']
      },
      response: { 201: { type: 'object' } }
    }
  }, async (request, reply) => {
    const data = createSchema.parse(request.body);
    const conta = await prisma.contas_pagar.create({
      data: {
        clinica_id: request.user.clinica_id,
        descricao: data.descricao,
        valor: data.valor,
        vencimento: new Date(data.vencimento),
        status: 'pendente',
        observacoes: data.observacoes ?? null
      }
    });
    return reply.code(201).send(conta);
  });

  fastify.put('/:id', {
    schema: {
      tags: ['contas_pagar'],
      summary: 'Atualizar conta a pagar',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] },
      body: { type: 'object' },
      response: { 200: { type: 'object' } }
    }
  }, async (request, reply) => {
    const id = parseInt(request.params.id);
    const existing = await prisma.contas_pagar.findFirst({
      where: { id, clinica_id: request.user.clinica_id }
    });
    if (!existing) return reply.code(404).send({ error: 'Conta não encontrada' });
    const data = updateSchema.parse(request.body);
    const update = {};
    if (data.descricao != null) update.descricao = data.descricao;
    if (data.valor != null) update.valor = data.valor;
    if (data.vencimento != null) update.vencimento = new Date(data.vencimento);
    if (data.status != null) update.status = data.status;
    if (data.pago_em !== undefined) update.pago_em = data.pago_em ? new Date(data.pago_em) : null;
    if (data.observacoes !== undefined) update.observacoes = data.observacoes;
    update.updated_at = new Date();
    const conta = await prisma.contas_pagar.update({
      where: { id },
      data: update
    });
    return conta;
  });

  fastify.delete('/:id', {
    schema: {
      tags: ['contas_pagar'],
      summary: 'Remover conta a pagar',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] },
      response: { 200: { type: 'object', properties: { ok: { type: 'boolean' } } } }
    }
  }, async (request, reply) => {
    const id = parseInt(request.params.id);
    const existing = await prisma.contas_pagar.findFirst({
      where: { id, clinica_id: request.user.clinica_id }
    });
    if (!existing) return reply.code(404).send({ error: 'Conta não encontrada' });
    await prisma.contas_pagar.delete({ where: { id } });
    return { ok: true };
  });
}

module.exports = contasPagarRoutes;
