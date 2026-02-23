const { z } = require('zod');
const prisma = require('../lib/prisma');

async function dashboardRoutes(fastify, options) {
  // Dashboard geral da clínica
  fastify.get('/', {
    schema: {
      tags: ['dashboard'],
      summary: 'Dashboard geral da clínica',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          data_inicio: { type: 'string', format: 'date' },
          data_fim: { type: 'string', format: 'date' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            resumo: {
              type: 'object',
              properties: {
                total_pacientes: { type: 'number' },
                total_consultas: { type: 'number' },
                total_dentistas: { type: 'number' },
                total_receita: { type: 'number' }
              }
            },
            consultas_por_mes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  mes: { type: 'string' },
                  quantidade: { type: 'number' }
                }
              }
            },
            consultas_por_status: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  quantidade: { type: 'number' }
                }
              }
            },
            top_procedimentos: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  nome: { type: 'string' },
                  quantidade: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { data_inicio, data_fim } = request.query;
    
    const dataInicio = data_inicio ? new Date(data_inicio) : new Date(new Date().getFullYear(), 0, 1);
    const dataFim = data_fim ? new Date(data_fim) : new Date(new Date().getFullYear(), 11, 31);

    // Resumo geral
    const [totalPacientes, totalConsultas, totalDentistas, totalReceita] = await Promise.all([
      prisma.pacientes.count({
        where: { clinica_id: request.user.clinica_id, ativo: true }
      }),
      prisma.consultas.count({
        where: { 
          clinica_id: request.user.clinica_id,
          data_consulta: {
            gte: dataInicio,
            lte: dataFim
          }
        }
      }),
      prisma.dentistas.count({
        where: { clinica_id: request.user.clinica_id, ativo: true }
      }),
      prisma.pagamentos.aggregate({
        where: { 
          clinica_id: request.user.clinica_id,
          status: 'pago',
          data_pagamento: {
            gte: dataInicio,
            lte: dataFim
          }
        },
        _sum: {
          valor: true
        }
      })
    ]);

    // Consultas por mês
    const consultasPorMes = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(data_consulta, 'YYYY-MM') as mes,
        COUNT(*) as quantidade
      FROM consultas
      WHERE clinica_id = ${request.user.clinica_id}
        AND data_consulta >= ${dataInicio}
        AND data_consulta <= ${dataFim}
      GROUP BY TO_CHAR(data_consulta, 'YYYY-MM')
      ORDER BY mes
    `;

    // Consultas por status
    const consultasPorStatus = await prisma.consultas.groupBy({
      by: ['status'],
      where: { 
        clinica_id: request.user.clinica_id,
        data_consulta: {
          gte: dataInicio,
          lte: dataFim
        }
      },
      _count: {
        status: true
      }
    });

    // Top procedimentos
    const topProcedimentos = await prisma.$queryRaw`
      SELECT 
        p.nome,
        COUNT(cp.id) as quantidade
      FROM consulta_procedimentos cp
      JOIN procedimentos p ON cp.procedimento_id = p.id
      JOIN consultas c ON cp.consulta_id = c.id
      WHERE c.clinica_id = ${request.user.clinica_id}
        AND c.data_consulta >= ${dataInicio}
        AND c.data_consulta <= ${dataFim}
      GROUP BY p.nome
      ORDER BY quantidade DESC
      LIMIT 10
    `;

    return {
      resumo: {
        total_pacientes: totalPacientes,
        total_consultas: totalConsultas,
        total_dentistas: totalDentistas,
        total_receita: totalReceita._sum.valor || 0
      },
      consultas_por_mes: consultasPorMes,
      consultas_por_status: consultasPorStatus.map(item => ({
        status: item.status,
        quantidade: item._count.status
      })),
      top_procedimentos: topProcedimentos
    };
  });

  // Dashboard do odontólogo
  fastify.get('/dentista', {
    schema: {
      tags: ['dashboard'],
      summary: 'Dashboard do odontólogo',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          data_inicio: { type: 'string', format: 'date' },
          data_fim: { type: 'string', format: 'date' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            resumo: {
              type: 'object',
              properties: {
                total_consultas: { type: 'number' },
                total_pacientes: { type: 'number' },
                total_procedimentos: { type: 'number' }
              }
            },
            consultas_hoje: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  hora_inicio: { type: 'string' },
                  paciente: { type: 'string' },
                  status: { type: 'string' }
                }
              }
            },
            proximas_consultas: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  data_consulta: { type: 'string', format: 'date' },
                  hora_inicio: { type: 'string' },
                  paciente: { type: 'string' },
                  status: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    preHandler: async (request, reply) => {
      if (request.user.role !== 'dentista') {
        return reply.code(403).send({ error: 'Apenas odontólogos podem acessar este dashboard' });
      }
    }
  }, async (request, reply) => {
    const { data_inicio, data_fim } = request.query;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const dataInicio = data_inicio ? new Date(data_inicio) : hoje;
    const dataFim = data_fim ? new Date(data_fim) : new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Resumo do odontólogo
    const [totalConsultas, totalPacientes, totalProcedimentos] = await Promise.all([
      prisma.consultas.count({
        where: { 
          dentista_id: request.user.id,
          data_consulta: {
            gte: dataInicio,
            lte: dataFim
          }
        }
      }),
      prisma.$queryRaw`
        SELECT COUNT(DISTINCT paciente_id) as total
        FROM consultas
        WHERE dentista_id = ${request.user.id}
          AND data_consulta >= ${dataInicio}
          AND data_consulta <= ${dataFim}
      `,
      prisma.consulta_procedimentos.count({
        where: { 
          consulta: {
            dentista_id: request.user.id,
            data_consulta: {
              gte: dataInicio,
              lte: dataFim
            }
          }
        }
      })
    ]);

    // Consultas de hoje
    const consultasHoje = await prisma.consultas.findMany({
      where: {
        dentista_id: request.user.id,
        data_consulta: hoje,
        status: {
          notIn: ['cancelada']
        }
      },
      select: {
        id: true,
        hora_inicio: true,
        status: true,
        paciente: {
          select: { nome: true }
        }
      },
      orderBy: [
        { hora_inicio: 'asc' }
      ]
    });

    // Próximas consultas
    const proximasConsultas = await prisma.consultas.findMany({
      where: {
        dentista_id: request.user.id,
        data_consulta: {
          gte: hoje,
          lte: new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000)
        },
        status: {
          notIn: ['cancelada', 'concluida']
        }
      },
      select: {
        id: true,
        data_consulta: true,
        hora_inicio: true,
        status: true,
        paciente: {
          select: { nome: true }
        }
      },
      orderBy: [
        { data_consulta: 'asc' },
        { hora_inicio: 'asc' }
      ],
      take: 10
    });

    return {
      resumo: {
        total_consultas: totalConsultas,
        total_pacientes: totalPacientes[0].total,
        total_procedimentos: totalProcedimentos
      },
      consultas_hoje: consultasHoje.map(c => ({
        id: c.id,
        hora_inicio: c.hora_inicio,
        paciente: c.paciente.nome,
        status: c.status
      })),
      proximas_consultas: proximasConsultas.map(c => ({
        id: c.id,
        data_consulta: c.data_consulta,
        hora_inicio: c.hora_inicio,
        paciente: c.paciente.nome,
        status: c.status
      }))
    };
  });

  // Dashboard financeiro
  fastify.get('/financeiro', {
    schema: {
      tags: ['dashboard'],
      summary: 'Dashboard financeiro',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          data_inicio: { type: 'string', format: 'date' },
          data_fim: { type: 'string', format: 'date' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            receita_por_mes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  mes: { type: 'string' },
                  receita: { type: 'number' }
                }
              }
            },
            pagamentos_por_status: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  quantidade: { type: 'number' },
                  valor: { type: 'number' }
                }
              }
            },
            top_dentistas_receita: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  nome: { type: 'string' },
                  receita: { type: 'number' }
                }
              }
            }
          }
        }
      }
    },
    preHandler: async (request, reply) => {
      if (request.user.role !== 'clinica_admin') {
        return reply.code(403).send({ error: 'Apenas administradores podem acessar o dashboard financeiro' });
      }
    }
  }, async (request, reply) => {
    const { data_inicio, data_fim } = request.query;
    
    const dataInicio = data_inicio ? new Date(data_inicio) : new Date(new Date().getFullYear(), 0, 1);
    const dataFim = data_fim ? new Date(data_fim) : new Date(new Date().getFullYear(), 11, 31);

    // Receita por mês
    const receitaPorMes = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(p.data_pagamento, 'YYYY-MM') as mes,
        SUM(p.valor) as receita
      FROM pagamentos p
      WHERE p.clinica_id = ${request.user.clinica_id}
        AND p.status = 'pago'
        AND p.data_pagamento >= ${dataInicio}
        AND p.data_pagamento <= ${dataFim}
      GROUP BY TO_CHAR(p.data_pagamento, 'YYYY-MM')
      ORDER BY mes
    `;

    // Pagamentos por status
    const pagamentosPorStatus = await prisma.pagamentos.groupBy({
      by: ['status'],
      where: { 
        clinica_id: request.user.clinica_id,
        created_at: {
          gte: dataInicio,
          lte: dataFim
        }
      },
      _count: {
        status: true
      },
      _sum: {
        valor: true
      }
    });

    // Top dentistas por receita
    const topDentistasReceita = await prisma.$queryRaw`
      SELECT 
        d.nome,
        SUM(p.valor) as receita
      FROM pagamentos p
      JOIN consultas c ON p.consulta_id = c.id
      JOIN dentistas d ON c.dentista_id = d.id
      WHERE p.clinica_id = ${request.user.clinica_id}
        AND p.status = 'pago'
        AND p.data_pagamento >= ${dataInicio}
        AND p.data_pagamento <= ${dataFim}
      GROUP BY d.nome
      ORDER BY receita DESC
      LIMIT 10
    `;

    return {
      receita_por_mes: receitaPorMes,
      pagamentos_por_status: pagamentosPorStatus.map(item => ({
        status: item.status,
        quantidade: item._count.status,
        valor: item._sum.valor || 0
      })),
      top_dentistas_receita: topDentistasReceita
    };
  });
}

module.exports = dashboardRoutes;