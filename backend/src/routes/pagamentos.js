const { z } = require('zod');
const PDFDocument = require('pdfkit');
const prisma = require('../lib/prisma');
const { decryptPaciente } = require('../lib/cpfCrypto');

// Validações
const pagamentoSchema = z.object({
  consulta_id: z.number().int().positive('ID da consulta inválido'),
  valor: z.number().positive('Valor deve ser positivo'),
  forma_pagamento: z.enum(['dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'transferencia']),
  parcelas: z.number().int().min(1).max(12).optional(),
  data_vencimento: z.string().optional(),
  observacoes: z.string().optional()
});

async function pagamentoRoutes(fastify, options) {
  // Listar pagamentos
  fastify.get('/', {
    schema: {
      tags: ['pagamentos'],
      summary: 'Listar pagamentos',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          status: { type: 'string', enum: ['pendente', 'pago', 'atrasado', 'cancelado'] },
          forma_pagamento: { type: 'string' },
          data_inicio: { type: 'string', format: 'date' },
          data_fim: { type: 'string', format: 'date' },
          paciente_id: { type: 'number' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            pagamentos: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  valor: { type: 'number' },
                  forma_pagamento: { type: 'string' },
                  status: { type: 'string' },
                  data_vencimento: { type: 'string', format: 'date' },
                  data_pagamento: { type: 'string', format: 'date' },
                  parcelas: { type: 'number' },
                  observacoes: { type: 'string' },
                  consulta: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      data_consulta: { type: 'string', format: 'date' },
                      paciente: {
                        type: 'object',
                        properties: {
                          nome: { type: 'string' }
                        }
                      }
                    }
                  },
                  created_at: { type: 'string', format: 'date-time' }
                }
              }
            },
            total: { type: 'number' },
            page: { type: 'number' },
            totalPages: { type: 'number' },
            total_receita: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      forma_pagamento, 
      data_inicio, 
      data_fim, 
      paciente_id 
    } = request.query;
    
    const skip = (page - 1) * limit;

    const where = {
      clinica_id: request.user.clinica_id
    };

    if (status) {
      where.status = status;
    }

    if (forma_pagamento) {
      where.forma_pagamento = forma_pagamento;
    }

    if (data_inicio || data_fim) {
      where.created_at = {};
      if (data_inicio) {
        where.created_at.gte = new Date(data_inicio);
      }
      if (data_fim) {
        where.created_at.lte = new Date(data_fim);
      }
    }

    if (paciente_id) {
      where.consulta = {
        paciente_id: parseInt(paciente_id)
      };
    }

    const [pagamentos, total, totalReceita] = await Promise.all([
      prisma.pagamentos.findMany({
        where,
        include: {
          consulta: {
            select: {
              id: true,
              data_consulta: true,
              paciente: {
                select: {
                  nome: true
                }
              }
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      prisma.pagamentos.count({ where }),
      prisma.pagamentos.aggregate({
        where: { ...where, status: 'pago' },
        _sum: { valor: true }
      })
    ]);

    return {
      pagamentos,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      total_receita: totalReceita._sum.valor || 0
    };
  });

  // Recibo em PDF
  fastify.get('/:id/recibo', {
    schema: {
      tags: ['pagamentos'],
      summary: 'Download recibo do pagamento em PDF',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] }
    }
  }, async (request, reply) => {
    const id = parseInt(request.params.id);
    const pagamento = await prisma.pagamentos.findFirst({
      where: { id, clinica_id: request.user.clinica_id }
    });
    if (!pagamento) return reply.code(404).send({ error: 'Pagamento não encontrado' });

    const consulta = await prisma.consultas.findFirst({
      where: { id: pagamento.consulta_id, clinica_id: request.user.clinica_id }
    });
    let pacienteNome = '—';
    let dentistaNome = '—';
    let dataHora = null;
    if (consulta) {
      dataHora = consulta.data_hora ? new Date(consulta.data_hora) : null;
      const [paciente, dentista] = await Promise.all([
        prisma.pacientes.findFirst({ where: { id: consulta.paciente_id }, select: { nome: true } }),
        prisma.dentistas.findFirst({ where: { id: consulta.dentista_id }, select: { nome: true } })
      ]);
      if (paciente) pacienteNome = paciente.nome;
      if (dentista) dentistaNome = dentista.nome;
    }

    const buffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A5', margin: 40 });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('Recibo de Pagamento', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10);
      const dataConsulta = dataHora ? dataHora.toLocaleDateString('pt-BR') + ' ' + dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
      const dataPag = pagamento.data_pagamento ? new Date(pagamento.data_pagamento).toLocaleDateString('pt-BR') : '—';
      const valor = Number(pagamento.valor);
      const valorStr = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      doc.text(`Paciente: ${pacienteNome}`);
      doc.text(`Consulta: ${dataConsulta}`);
      doc.text(`Profissional: ${dentistaNome}`);
      doc.moveDown();
      doc.text(`Data do pagamento: ${dataPag}`);
      doc.text(`Forma: ${(pagamento.forma_pagamento || '').replace(/_/g, ' ')}`);
      doc.fontSize(14).text(`Valor: ${valorStr}`, { align: 'right' });
      doc.moveDown(2);
      doc.fontSize(9).text(`Recibo referente ao pagamento #${id}. Emitido em ${new Date().toLocaleString('pt-BR')}.`, { align: 'center' });
      doc.end();
    });

    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="recibo-${id}.pdf"`)
      .send(buffer);
  });

  // Buscar pagamento por ID
  fastify.get('/:id', {
    schema: {
      tags: ['pagamentos'],
      summary: 'Buscar pagamento por ID',
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

    const pagamento = await prisma.pagamentos.findFirst({
      where: {
        id: parseInt(id),
        clinica_id: request.user.clinica_id
      },
      include: {
        consulta: {
          include: {
            paciente: {
              select: { nome: true, cpf: true }
            },
            dentista: {
              select: { nome: true }
            }
          }
        }
      }
    });

    if (!pagamento) {
      return reply.code(404).send({ error: 'Pagamento não encontrado' });
    }

    if (pagamento.consulta?.paciente) {
      pagamento.consulta.paciente = decryptPaciente(pagamento.consulta.paciente);
    }
    return pagamento;
  });
  fastify.post('/', {
    schema: {
      tags: ['pagamentos'],
      summary: 'Criar novo pagamento',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          consulta_id: { type: 'number', minimum: 1 },
          valor: { type: 'number', minimum: 0.01 },
          forma_pagamento: { type: 'string', enum: ['dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'transferencia'] },
          parcelas: { type: 'number', minimum: 1, maximum: 12 },
          data_vencimento: { type: 'string', format: 'date' },
          observacoes: { type: 'string' }
        },
        required: ['consulta_id', 'valor', 'forma_pagamento']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            valor: { type: 'number' },
            forma_pagamento: { type: 'string' },
            status: { type: 'string' },
            data_vencimento: { type: 'string', format: 'date' },
            created_at: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const dados = pagamentoSchema.parse(request.body);

      // Verificar se consulta existe e pertence à clínica
      const consulta = await prisma.consultas.findFirst({
        where: {
          id: dados.consulta_id,
          clinica_id: request.user.clinica_id
        }
      });

      if (!consulta) {
        return reply.code(404).send({ error: 'Consulta não encontrada' });
      }

      // Verificar se já existe pagamento para esta consulta
      const pagamentoExistente = await prisma.pagamentos.findFirst({
        where: {
          consulta_id: dados.consulta_id,
          status: {
            notIn: ['cancelado']
          }
        }
      });

      if (pagamentoExistente) {
        return reply.code(409).send({ error: 'Já existe pagamento para esta consulta' });
      }

      const pagamento = await prisma.pagamentos.create({
        data: {
          ...dados,
          clinica_id: request.user.clinica_id,
          data_vencimento: dados.data_vencimento ? new Date(dados.data_vencimento) : new Date()
        }
      });

      return reply.code(201).send(pagamento);
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

  // Atualizar pagamento
  fastify.put('/:id', {
    schema: {
      tags: ['pagamentos'],
      summary: 'Atualizar pagamento',
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
          valor: { type: 'number', minimum: 0.01 },
          forma_pagamento: { type: 'string', enum: ['dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'transferencia'] },
          parcelas: { type: 'number', minimum: 1, maximum: 12 },
          data_vencimento: { type: 'string', format: 'date' },
          observacoes: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    
    try {
      const dados = pagamentoSchema.partial().parse(request.body);

      // Verificar se pagamento existe e pertence à clínica
      const pagamento = await prisma.pagamentos.findFirst({
        where: {
          id: parseInt(id),
          clinica_id: request.user.clinica_id
        }
      });

      if (!pagamento) {
        return reply.code(404).send({ error: 'Pagamento não encontrado' });
      }

      // Não permitir alterar pagamentos pagos ou cancelados
      if (pagamento.status === 'pago' || pagamento.status === 'cancelado') {
        return reply.code(400).send({ error: 'Não é possível alterar pagamentos pagos ou cancelados' });
      }

      const pagamentoAtualizado = await prisma.pagamentos.update({
        where: { id: parseInt(id) },
        data: {
          ...dados,
          data_vencimento: dados.data_vencimento ? new Date(dados.data_vencimento) : undefined
        }
      });

      return pagamentoAtualizado;
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

  // Registrar pagamento
  fastify.post('/:id/pagar', {
    schema: {
      tags: ['pagamentos'],
      summary: 'Registrar pagamento',
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
          data_pagamento: { type: 'string', format: 'date' },
          observacoes: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { data_pagamento, observacoes } = request.body;

    const pagamento = await prisma.pagamentos.findFirst({
      where: {
        id: parseInt(id),
        clinica_id: request.user.clinica_id
      }
    });

    if (!pagamento) {
      return reply.code(404).send({ error: 'Pagamento não encontrado' });
    }

    if (pagamento.status === 'pago') {
      return reply.code(400).send({ error: 'Pagamento já foi realizado' });
    }

    if (pagamento.status === 'cancelado') {
      return reply.code(400).send({ error: 'Pagamento está cancelado' });
    }

    const pagamentoAtualizado = await prisma.pagamentos.update({
      where: { id: parseInt(id) },
      data: {
        status: 'pago',
        data_pagamento: data_pagamento ? new Date(data_pagamento) : new Date(),
        observacoes: observacoes || pagamento.observacoes
      }
    });

    return pagamentoAtualizado;
  });

  // Cancelar pagamento
  fastify.post('/:id/cancelar', {
    schema: {
      tags: ['pagamentos'],
      summary: 'Cancelar pagamento',
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
          motivo: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { motivo } = request.body;

    const pagamento = await prisma.pagamentos.findFirst({
      where: {
        id: parseInt(id),
        clinica_id: request.user.clinica_id
      }
    });

    if (!pagamento) {
      return reply.code(404).send({ error: 'Pagamento não encontrado' });
    }

    if (pagamento.status === 'pago') {
      return reply.code(400).send({ error: 'Não é possível cancelar pagamentos pagos' });
    }

    const pagamentoCancelado = await prisma.pagamentos.update({
      where: { id: parseInt(id) },
      data: {
        status: 'cancelado',
        observacoes: motivo ? `${pagamento.observacoes || ''} - Cancelado: ${motivo}` : pagamento.observacoes
      }
    });

    return pagamentoCancelado;
  });

  // Dashboard de recebíveis
  fastify.get('/dashboard/recebiveis', {
    schema: {
      tags: ['pagamentos'],
      summary: 'Dashboard de recebíveis',
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
            total_recebido: { type: 'number' },
            total_pendente: { type: 'number' },
            total_atrasado: { type: 'number' },
            total_cancelado: { type: 'number' },
            recebiveis_por_mes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  mes: { type: 'string' },
                  recebido: { type: 'number' },
                  pendente: { type: 'number' }
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

    const [totalPorStatus, recebiveisPorMes] = await Promise.all([
      prisma.pagamentos.groupBy({
        by: ['status'],
        where: { 
          clinica_id: request.user.clinica_id,
          created_at: {
            gte: dataInicio,
            lte: dataFim
          }
        },
        _sum: { valor: true }
      }),
      prisma.$queryRaw`
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM') as mes,
          SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END) as recebido,
          SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END) as pendente
        FROM pagamentos
        WHERE clinica_id = ${request.user.clinica_id}
          AND created_at >= ${dataInicio}
          AND created_at <= ${dataFim}
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY mes
      `
    ]);

    const dashboard = {
      total_recebido: 0,
      total_pendente: 0,
      total_atrasado: 0,
      total_cancelado: 0,
      recebiveis_por_mes: recebiveisPorMes
    };

    totalPorStatus.forEach(item => {
      switch (item.status) {
        case 'pago':
          dashboard.total_recebido = item._sum.valor || 0;
          break;
        case 'pendente':
          dashboard.total_pendente = item._sum.valor || 0;
          break;
        case 'atrasado':
          dashboard.total_atrasado = item._sum.valor || 0;
          break;
        case 'cancelado':
          dashboard.total_cancelado = item._sum.valor || 0;
          break;
      }
    });

    return dashboard;
  });
}

module.exports = pagamentoRoutes;