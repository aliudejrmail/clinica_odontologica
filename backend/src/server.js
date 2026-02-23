// Importações
require('dotenv').config();
console.log('Iniciando servidor...');
const fastify = require('fastify');
const cors = require('@fastify/cors');
const helmet = require('@fastify/helmet');
const rateLimit = require('@fastify/rate-limit');
const swagger = require('@fastify/swagger');
const swaggerUi = require('@fastify/swagger-ui');
const jwt = require('@fastify/jwt');

// Configurações
const { PORT = 3333, JWT_SECRET, NODE_ENV } = process.env;

// Criar aplicação Fastify
const app = fastify({
  logger: NODE_ENV === 'development',
  trustProxy: true
});

// Registrar plugins
app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
});

app.register(cors, {
  origin: NODE_ENV === 'production' ? process.env.FRONTEND_URL : true,
  credentials: true
});

app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  allowList: ['127.0.0.1']
});

app.register(jwt, {
  secret: JWT_SECRET || 'odonto_clinica_secret_key_2024_muito_segura'
});

// Documentação Swagger
app.register(swagger, {
  swagger: {
    info: {
      title: 'OdontoClínica API',
      description: 'API para gerenciamento de clínicas odontológicas',
      version: '1.0.0'
    },
    host: NODE_ENV === 'production' ? process.env.API_HOST : `localhost:${PORT}`,
    schemes: NODE_ENV === 'production' ? ['https'] : ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
    tags: [
      { name: 'auth', description: 'Autenticação' },
      { name: 'clinicas', description: 'Gestão de clínicas' },
      { name: 'pacientes', description: 'Gestão de pacientes' },
      { name: 'dentistas', description: 'Gestão de odontólogos' },
      { name: 'consultas', description: 'Gestão de consultas' },
      { name: 'procedimentos', description: 'Gestão de procedimentos' },
      { name: 'odontogramas', description: 'Odontograma' },
      { name: 'pagamentos', description: 'Gestão de pagamentos' },
      { name: 'dashboard', description: 'Dashboard e relatórios' }
    ],
    securityDefinitions: {
      bearerAuth: {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header',
        description: 'JWT Token'
      }
    }
  }
});

app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false
  }
});

// Hooks
app.addHook('onRequest', async (request, reply) => {
  // Log de requisições
  if (NODE_ENV === 'development') {
    console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
  }
});

app.addHook('preHandler', async (request, reply) => {
  // Verificar autenticação para rotas protegidas
  const publicRoutes = ['/', '/favicon.ico', '/auth/login', '/auth/register', '/health', '/docs', '/docs/*'];
  const isPublicRoute = publicRoutes.some(route => {
    if (route.includes('*')) {
      return request.url.startsWith(route.replace('*', ''));
    }
    return request.url === route;
  });

  if (!isPublicRoute) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Token inválido ou expirado' });
    }
  }
});

// Rota raiz
app.get('/', async (request, reply) => {
  return {
    message: 'API Odonto Clínica - Backend',
    version: '1.0.0',
    docs: '/docs'
  };
});

// Favicon (evitar 404)
app.get('/favicon.ico', async (request, reply) => {
  return reply.code(204).send();
});

// Rotas de health check
app.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV
  };
});

// Importar rotas
const authRoutes = require('./routes/auth_real');
const clinicaRoutes = require('./routes/clinicas');
const pacienteRoutes = require('./routes/pacientes');
const dentistaRoutes = require('./routes/dentistas');
const consultaRoutes = require('./routes/consultas');
const procedimentoRoutes = require('./routes/procedimentos');
const odontogramaRoutes = require('./routes/odontogramas');
const pagamentoRoutes = require('./routes/pagamentos');
const dashboardRoutes = require('./routes/dashboard');
const anamneseRoutes = require('./routes/anamnese');
const contasPagarRoutes = require('./routes/contas_pagar');

// Registrar rotas
app.register(authRoutes, { prefix: '/auth' });
app.register(clinicaRoutes, { prefix: '/clinicas' });
app.register(pacienteRoutes, { prefix: '/pacientes' });
app.register(dentistaRoutes, { prefix: '/dentistas' });
app.register(consultaRoutes, { prefix: '/consultas' });
app.register(procedimentoRoutes, { prefix: '/procedimentos' });
app.register(odontogramaRoutes, { prefix: '/odontogramas' });
app.register(pagamentoRoutes, { prefix: '/pagamentos' });
app.register(dashboardRoutes, { prefix: '/dashboard' });
app.register(anamneseRoutes, { prefix: '/anamnese' });
app.register(contasPagarRoutes, { prefix: '/contas-pagar' });

// Handler de erros
app.setErrorHandler((error, request, reply) => {
  console.error('Erro:', error);
  
  if (error.validation) {
    return reply.code(400).send({
      error: 'Erro de validação',
      details: error.validation.map(err => ({
        field: err.instancePath,
        message: err.message
      }))
    });
  }

  if (error.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID') {
    return reply.code(401).send({ error: 'Token inválido' });
  }

  if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
    return reply.code(401).send({ error: 'Token não fornecido' });
  }

  if (error.code === 'P2002') {
    return reply.code(409).send({ 
      error: 'Registro duplicado',
      field: error.meta?.target 
    });
  }

  if (error.code === 'P2025') {
    return reply.code(404).send({ error: 'Registro não encontrado' });
  }

  return reply.code(500).send({ 
    error: 'Erro interno do servidor',
    message: NODE_ENV === 'development' ? error.message : 'Ocorreu um erro inesperado'
  });
});

// Iniciar servidor
const start = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📚 Documentação disponível em http://localhost:${PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}

module.exports = app;