const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Middleware para adicionar contexto RLS
prisma.$use(async (params, next) => {
  const { model, action, args } = params;
  
  // Adicionar contexto RLS se disponível
  if (global.rlContext) {
    const { clinicaId, userRole, userId } = global.rlContext;
    
    // Adicionar filtro de clínica para modelos que têm clinica_id
    const modelsWithClinica = ['clinicas', 'users', 'pacientes', 'dentistas', 'consultas', 'procedimentos', 'odontogramas', 'pagamentos'];
    
    if (modelsWithClinica.includes(model) && action !== 'findUnique') {
      if (!args.where) args.where = {};
      if (model === 'clinicas') {
        args.where.id = clinicaId;
      } else {
        args.where.clinica_id = clinicaId;
      }
    }
    
    // Filtros específicos por role
    if (userRole === 'paciente' && model === 'pacientes') {
      if (!args.where) args.where = {};
      args.where.id = userId;
    }
    
    if (userRole === 'dentista' && model === 'consultas') {
      if (!args.where) args.where = {};
      args.where.dentista_id = userId;
    }
  }
  
  return next(params);
});

module.exports = prisma;