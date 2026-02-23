const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../lib/prisma');

// Validações
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres')
});

const registerSchema = z.object({
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
                id: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' }
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

      if (!user) {
        return reply.code(401).send({ error: 'Credenciais inválidas' });
      }

      // Verificar se está ativo
      if (!user.is_active) {
        return reply.code(401).send({ error: 'Usuário desativado' });
      }

      // Verificar senha
      const senhaValida = await bcrypt.compare(senha, user.password_hash);
      if (!senhaValida) {
        return reply.code(401).send({ error: 'Credenciais inválidas' });
      }

      // Atualizar último login
      await prisma.users.update({
        where: { id: user.id },
        data: { last_login: new Date() }
      });

      // Gerar token JWT
      const token = fastify.jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          clinica_id: user.clinica_id
        },
        { expiresIn: '24h' }
      );

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          clinica_id: user.clinica_id
        }
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Dados inválidos', details: error.errors });
      }
      throw error;
    }
  });

  // Registrar novo usuário
  fastify.post('/register', {
    schema: {
      tags: ['auth'],
      summary: 'Registrar novo usuário',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          senha: { type: 'string', minLength: 6 },
          role: { type: 'string', enum: ['clinica_admin', 'dentista', 'recepcionista'] }
        },
        required: ['email', 'senha', 'role']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' }
          }
        }
      }
    },
    preHandler: async (request, reply) => {
      // Apenas admins podem criar novos usuários
      if (request.user.role !== 'clinica_admin') {
        return reply.code(403).send({ error: 'Apenas administradores podem criar usuários' });
      }
    }
  }, async (request, reply) => {
    try {
      const { email, senha, role } = registerSchema.parse(request.body);

      // Verificar se email já existe
      const usuarioExistente = await prisma.users.findUnique({
        where: { email }
      });

      if (usuarioExistente) {
        return reply.code(400).send({ error: 'Email já cadastrado' });
      }

      // Criptografar senha
      const senhaHash = await bcrypt.hash(senha, 10);

      // Criar usuário
      const novoUsuario = await prisma.users.create({
        data: {
          email,
          password_hash: senhaHash,
          role,
          is_active: true,
          clinica_id: request.user.clinica_id
        }
      });

      return reply.code(201).send({
        id: novoUsuario.id,
        email: novoUsuario.email,
        role: novoUsuario.role
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Dados inválidos', details: error.errors });
      }
      throw error;
    }
  });

  // Obter informações do usuário logado
  fastify.get('/me', {
    schema: {
      tags: ['auth'],
      summary: 'Informações do usuário logado',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            last_login: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const user = await prisma.users.findUnique({
      where: { id: request.user.id }
    });

    if (!user) {
      return reply.code(404).send({ error: 'Usuário não encontrado' });
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      last_login: user.last_login
    };
  });
}

module.exports = authRoutes;