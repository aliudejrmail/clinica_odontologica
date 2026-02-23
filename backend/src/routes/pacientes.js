const { z } = require('zod');
const prisma = require('../lib/prisma');

// Validações
const pacienteSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos').optional(),
  data_nascimento: z.string().optional(),
  telefone: z.string().max(20, 'Telefone muito longo').optional(),
  email: z.string().email('Email inválido').optional(),
  endereco: z.string().optional(),
  observacoes: z.string().optional()
});

async function pacienteRoutes(fastify, options) {
  // Listar pacientes
  fastify.get('/', {
    schema: {
      tags: ['pacientes'],
      summary: 'Listar pacientes',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
          ativo: { type: 'boolean' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            pacientes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  nome: { type: 'string' },
                  cpf: { type: 'string' },
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
    const { page = 1, limit = 20, search, ativo } = request.query;
    const skip = (page - 1) * limit;

    // Configurar contexto RLS
    global.rlContext = {
      clinicaId: request.user.clinica_id,
      userRole: request.user.role,
      userId: request.user.id
    };

    const where = {
      clinica_id: request.user.clinica_id
    };

    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search.replace(/\D/g, '') } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (ativo !== undefined) {
      where.ativo = ativo;
    }

    const [pacientes, total] = await Promise.all([
      prisma.pacientes.findMany({
        where,
        select: {
          id: true,
          nome: true,
          cpf: true,
          telefone: true,
          email: true,
          ativo: true,
          created_at: true
        },
        orderBy: { nome: 'asc' },
        skip,
        take: limit
      }),
      prisma.pacientes.count({ where })
    ]);

    // Limpar contexto RLS
    delete global.rlContext;

    return {
      pacientes,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  });

  // Buscar paciente por ID
  fastify.get('/:id', {
    schema: {
      tags: ['pacientes'],
      summary: 'Buscar paciente por ID',
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
            nome: { type: 'string' },
            cpf: { type: 'string' },
            data_nascimento: { type: 'string', format: 'date' },
            telefone: { type: 'string' },
            email: { type: 'string' },
            endereco: { type: 'string' },
            cep: { type: 'string' },
            cidade: { type: 'string' },
            estado: { type: 'string' },
            alergias: { type: 'string' },
            medicamentos: { type: 'string' },
            observacoes: { type: 'string' },
            ativo: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;

    const paciente = await prisma.pacientes.findFirst({
      where: {
        id: parseInt(id),
        clinica_id: request.user.clinica_id
      }
    });

    if (!paciente) {
      return reply.code(404).send({ error: 'Paciente não encontrado' });
    }

    return paciente;
  });

  // Criar paciente
  fastify.post('/', {
    schema: {
      tags: ['pacientes'],
      summary: 'Criar novo paciente',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          nome: { type: 'string', minLength: 3 },
          cpf: { type: 'string', pattern: '^\\d{11}$' },
          data_nascimento: { type: 'string', format: 'date' },
          telefone: { type: 'string', maxLength: 20 },
          email: { type: 'string', format: 'email' },
          endereco: { type: 'string' },
          observacoes: { type: 'string' }
        },
        required: ['nome']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            nome: { type: 'string' },
            cpf: { type: 'string' },
            telefone: { type: 'string' },
            email: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const dados = pacienteSchema.parse(request.body);
      
      // Converter data_nascimento para Date se fornecida
      if (dados.data_nascimento) {
        dados.data_nascimento = new Date(dados.data_nascimento);
      }

      const paciente = await prisma.pacientes.create({
        data: {
          ...dados,
          clinica_id: request.user.clinica_id
        }
      });

      return reply.code(201).send(paciente);
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

  // Atualizar paciente
  fastify.put('/:id', {
    schema: {
      tags: ['pacientes'],
      summary: 'Atualizar paciente',
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
          cpf: { type: 'string', pattern: '^\\d{11}$' },
          data_nascimento: { type: 'string', format: 'date' },
          telefone: { type: 'string', maxLength: 20 },
          email: { type: 'string', format: 'email' },
          endereco: { type: 'string' },
          observacoes: { type: 'string' },
          ativo: { type: 'boolean' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    
    try {
      const dados = pacienteSchema.partial().parse(request.body);
      
      // Converter data_nascimento para Date se fornecida
      if (dados.data_nascimento) {
        dados.data_nascimento = new Date(dados.data_nascimento);
      }

      const paciente = await prisma.pacientes.update({
        where: {
          id: parseInt(id),
          clinica_id: request.user.clinica_id
        },
        data: dados
      });

      return paciente;
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

  // Aniversariantes do mês (ou período)
  fastify.get('/aniversariantes', {
    schema: {
      tags: ['pacientes'],
      summary: 'Pacientes que fazem aniversário no mês',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          mes: { type: 'number', minimum: 1, maximum: 12 },
          ano: { type: 'number', minimum: 2020 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            aniversariantes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  nome: { type: 'string' },
                  data_nascimento: { type: 'string', format: 'date' },
                  telefone: { type: 'string' },
                  email: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const mes = request.query.mes != null ? parseInt(request.query.mes, 10) : new Date().getMonth() + 1;

    const pacientes = await prisma.$queryRaw`
      SELECT id, nome, data_nascimento, telefone, email
      FROM pacientes
      WHERE clinica_id = ${request.user.clinica_id}
        AND (ativo IS NULL OR ativo = true)
        AND EXTRACT(MONTH FROM data_nascimento) = ${mes}
      ORDER BY EXTRACT(DAY FROM data_nascimento), nome
    `;

    return { aniversariantes: pacientes };
  });

  // Buscar paciente por CPF
  fastify.get('/cpf/:cpf', {
    schema: {
      tags: ['pacientes'],
      summary: 'Buscar paciente por CPF',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          cpf: { type: 'string', pattern: '^\\d{11}$' }
        },
        required: ['cpf']
      }
    }
  }, async (request, reply) => {
    const { cpf } = request.params;

    const paciente = await prisma.pacientes.findFirst({
      where: {
        cpf: cpf.replace(/\D/g, ''),
        clinica_id: request.user.clinica_id
      }
    });

    if (!paciente) {
      return reply.code(404).send({ error: 'Paciente não encontrado' });
    }

    return paciente;
  });
}

module.exports = pacienteRoutes;