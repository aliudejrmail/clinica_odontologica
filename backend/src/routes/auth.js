const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../lib/prisma');

// Validações
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres')
});

const registerSchema = z.object({
  clinica_id: z.number().int().positive(),
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  role: z.enum(['clinica_admin', 'dentista', 'recepcionista'])
});

async function authRoutes(fastify, options) {
  // Login
  fastify.post('/login', {
    schema: {
      tags: ['auth'],
      summary: 'Autenticar usuário',
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          senha: { type: 'string', minLength: 6 }
        },
        required: ['email', 'senha']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                nome: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
                clinica_id: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { email, senha } = loginSchema.parse(request.body);

      // Buscar usuário
      const user = await prisma.users.findUnique({
        where: { email }
      });

      if (!user || !user.ativo) {
        return reply.code(401).send({ error: 'Credenciais inválidas' });
      }

      // Verificar senha
      const senhaValida = await bcrypt.compare(senha, user.senha);
      if (!senhaValida) {
        return reply.code(401).send({ error: 'Credenciais inválidas' });
      }

      // Gerar token JWT
      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
        clinica_id: user.clinica_id
      });

      return reply.send({
        token,
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          role: user.role,
          clinica_id: user.clinica_id
        }
      });
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

  // Registrar novo usuário (apenas admin)
  fastify.post('/register', {
    schema: {
      tags: ['auth'],
      summary: 'Registrar novo usuário',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          clinica_id: { type: 'number' },
          nome: { type: 'string', minLength: 3 },
          email: { type: 'string', format: 'email' },
          senha: { type: 'string', minLength: 6 },
          role: { type: 'string', enum: ['clinica_admin', 'dentista', 'recepcionista'] }
        },
        required: ['clinica_id', 'nome', 'email', 'senha', 'role']
      }
    },
    preHandler: async (request, reply) => {
      // Verificar se é admin da clínica
      if (request.user.role !== 'clinica_admin') {
        return reply.code(403).send({ error: 'Apenas administradores podem criar usuários' });
      }
    }
  }, async (request, reply) => {
    try {
      const { clinica_id, nome, email, senha, role } = registerSchema.parse(request.body);

      // Verificar se email já existe
      const userExistente = await prisma.users.findUnique({
        where: { email }
      });

      if (userExistente) {
        return reply.code(409).send({ error: 'Email já cadastrado' });
      }

      // Hash da senha
      const senhaHash = await bcrypt.hash(senha, 12);

      // Criar usuário
      const user = await prisma.users.create({
        data: {
          clinica_id,
          nome,
          email,
          senha: senhaHash,
          role
        }
      });

      return reply.code(201).send({
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        clinica_id: user.clinica_id
      });
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

  // Perfil do usuário autenticado
  fastify.get('/me', {
    schema: {
      tags: ['auth'],
      summary: 'Obter perfil do usuário',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            nome: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
            clinica_id: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const user = await prisma.users.findUnique({
      where: { id: request.user.id },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        clinica_id: true
      }
    });

    if (!user) {
      return reply.code(404).send({ error: 'Usuário não encontrado' });
    }

    return user;
  });
}

module.exports = authRoutes;