const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { encrypt } = require('../lib/cpfCrypto');

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar clínica de teste
  const clinica = await prisma.clinicas.create({
    data: {
      nome: 'Clínica OdontoMaster',
      cnpj: '12345678000195',
      telefone: '(11) 1234-5678',
      endereco: 'Rua das Flores, 123, São Paulo - SP'
    }
  });

  console.log(`✅ Clínica criada: ${clinica.nome}`);

  // Criar usuários
  const usuarios = await Promise.all([
    // Admin
    prisma.users.create({
      data: {
        nome: 'Administrador',
        email: 'admin@odontomaster.com',
        senha: await bcrypt.hash('admin123', 10),
        role: 'clinica_admin',
        clinica_id: clinica.id,
        ativo: true
      }
    }),
    // Recepcionista
    prisma.users.create({
      data: {
        nome: 'Maria Silva',
        email: 'maria@odontomaster.com',
        senha: await bcrypt.hash('recepcao123', 10),
        role: 'recepcionista',
        clinica_id: clinica.id,
        ativo: true
      }
    })
  ]);

  console.log(`✅ Usuários criados: ${usuarios.length}`);

  // Criar dentistas
  const dentistas = await Promise.all([
    prisma.dentistas.create({
      data: {
        nome: 'Dr. João Oliveira',
        cro: 'SP-12345',
        especialidade: 'Ortodontia',
        telefone: '(11) 98765-4321',
        email: 'joao@odontomaster.com',
        clinica_id: clinica.id,
        ativo: true
      }
    }),
    prisma.dentistas.create({
      data: {
        nome: 'Dra. Ana Santos',
        cro: 'SP-67890',
        especialidade: 'Endodontia',
        telefone: '(11) 98765-4322',
        email: 'ana@odontomaster.com',
        clinica_id: clinica.id,
        ativo: true
      }
    }),
    prisma.dentistas.create({
      data: {
        nome: 'Dr. Pedro Costa',
        cro: 'SP-11111',
        especialidade: 'Implantodontia',
        telefone: '(11) 98765-4323',
        email: 'pedro@odontomaster.com',
        clinica_id: clinica.id,
        ativo: true
      }
    })
  ]);

  console.log(`✅ Dentistas criados: ${dentistas.length}`);

  // Criar procedimentos
  const procedimentos = await Promise.all([
    prisma.procedimentos.create({
      data: {
        nome: 'Limpeza Dental',
        descricao: 'Limpeza completa dos dentes',
        valor: 150.00,
        duracao_minutos: 45,
        clinica_id: clinica.id,
        ativo: true
      }
    }),
    prisma.procedimentos.create({
      data: {
        nome: 'Restauração',
        descricao: 'Restauração de dente com resina',
        valor: 200.00,
        duracao_minutos: 60,
        clinica_id: clinica.id,
        ativo: true
      }
    }),
    prisma.procedimentos.create({
      data: {
        nome: 'Extração',
        descricao: 'Extração dentária',
        valor: 250.00,
        duracao_minutos: 90,
        clinica_id: clinica.id,
        ativo: true
      }
    }),
    prisma.procedimentos.create({
      data: {
        nome: 'Canal',
        descricao: 'Tratamento de canal',
        valor: 800.00,
        duracao_minutos: 120,
        clinica_id: clinica.id,
        ativo: true
      }
    }),
    prisma.procedimentos.create({
      data: {
        nome: 'Clareamento',
        descricao: 'Clareamento dental',
        valor: 1000.00,
        duracao_minutos: 90,
        clinica_id: clinica.id,
        ativo: true
      }
    })
  ]);

  console.log(`✅ Procedimentos criados: ${procedimentos.length}`);

  // Criar pacientes
  const pacientes = await Promise.all([
    prisma.pacientes.create({
      data: {
        nome: 'Carlos Eduardo Silva',
        cpf: encrypt('12345678901'),
        rg: '12345678',
        data_nascimento: new Date('1985-03-15'),
        telefone: '(11) 91234-5678',
        email: 'carlos@email.com',
        endereco: 'Rua A, 123 - São Paulo - SP',
        observacoes: 'Paciente ansioso',
        clinica_id: clinica.id,
        ativo: true
      }
    }),
    prisma.pacientes.create({
      data: {
        nome: 'Juliana Pereira Santos',
        cpf: encrypt('98765432109'),
        rg: '87654321',
        data_nascimento: new Date('1990-07-22'),
        telefone: '(11) 98765-4321',
        email: 'juliana@email.com',
        endereco: 'Rua B, 456 - São Paulo - SP',
        observacoes: 'Alergia a anestesia',
        clinica_id: clinica.id,
        ativo: true
      }
    }),
    prisma.pacientes.create({
      data: {
        nome: 'Roberto Almeida Costa',
        cpf: encrypt('45678912301'),
        rg: '45678912',
        data_nascimento: new Date('1978-11-10'),
        telefone: '(11) 99876-5432',
        email: 'roberto@email.com',
        endereco: 'Rua C, 789 - São Paulo - SP',
        observacoes: '',
        clinica_id: clinica.id,
        ativo: true
      }
    }),
    prisma.pacientes.create({
      data: {
        nome: 'Mariana Ferreira Lima',
        cpf: encrypt('32109876543'),
        rg: '32109876',
        data_nascimento: new Date('1995-02-28'),
        telefone: '(11) 91234-9876',
        email: 'mariana@email.com',
        endereco: 'Rua D, 321 - São Paulo - SP',
        observacoes: 'Gestante',
        clinica_id: clinica.id,
        ativo: true
      }
    })
  ]);

  console.log(`✅ Pacientes criados: ${pacientes.length}`);

  // Criar consultas
  const hoje = new Date();
  const consultas = await Promise.all([
    // Consultas passadas
    prisma.consultas.create({
      data: {
        paciente_id: pacientes[0].id,
        dentista_id: dentistas[0].id,
        data_consulta: new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000),
        hora_inicio: '09:00',
        hora_fim: '09:45',
        status: 'concluida',
        observacoes: 'Limpeza realizada com sucesso',
        clinica_id: clinica.id
      }
    }),
    prisma.consultas.create({
      data: {
        paciente_id: pacientes[1].id,
        dentista_id: dentistas[1].id,
        data_consulta: new Date(hoje.getTime() - 15 * 24 * 60 * 60 * 1000),
        hora_inicio: '10:00',
        hora_fim: '11:00',
        status: 'concluida',
        observacoes: 'Restauração realizada',
        clinica_id: clinica.id
      }
    }),
    // Consultas futuras
    prisma.consultas.create({
      data: {
        paciente_id: pacientes[2].id,
        dentista_id: dentistas[2].id,
        data_consulta: new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000),
        hora_inicio: '14:00',
        hora_fim: '16:00',
        status: 'confirmada',
        observacoes: 'Tratamento de canal',
        clinica_id: clinica.id
      }
    }),
    prisma.consultas.create({
      data: {
        paciente_id: pacientes[3].id,
        dentista_id: dentistas[0].id,
        data_consulta: new Date(hoje.getTime() + 14 * 24 * 60 * 60 * 1000),
        hora_inicio: '15:30',
        hora_fim: '17:00',
        status: 'confirmada',
        observacoes: 'Clareamento dental',
        clinica_id: clinica.id
      }
    })
  ]);

  console.log(`✅ Consultas criadas: ${consultas.length}`);

  // Criar procedimentos nas consultas
  const consultaProcedimentos = await Promise.all([
    prisma.consulta_procedimentos.create({
      data: {
        consulta_id: consultas[0].id,
        procedimento_id: procedimentos[0].id,
        valor: procedimentos[0].valor,
        observacoes: 'Limpeza completa'
      }
    }),
    prisma.consulta_procedimentos.create({
      data: {
        consulta_id: consultas[1].id,
        procedimento_id: procedimentos[1].id,
        valor: procedimentos[1].valor,
        observacoes: 'Restauração do dente 36'
      }
    }),
    prisma.consulta_procedimentos.create({
      data: {
        consulta_id: consultas[2].id,
        procedimento_id: procedimentos[3].id,
        valor: procedimentos[3].valor,
        observacoes: 'Canal do dente 21'
      }
    }),
    prisma.consulta_procedimentos.create({
      data: {
        consulta_id: consultas[3].id,
        procedimento_id: procedimentos[4].id,
        valor: procedimentos[4].valor,
        observacoes: 'Clareamento completo'
      }
    })
  ]);

  console.log(`✅ Procedimentos nas consultas criados: ${consultaProcedimentos.length}`);

  // Criar pagamentos
  const pagamentos = await Promise.all([
    prisma.pagamentos.create({
      data: {
        consulta_id: consultas[0].id,
        valor: procedimentos[0].valor,
        forma_pagamento: 'dinheiro',
        status: 'pago',
        data_pagamento: new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000),
        data_vencimento: new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000),
        clinica_id: clinica.id
      }
    }),
    prisma.pagamentos.create({
      data: {
        consulta_id: consultas[1].id,
        valor: procedimentos[1].valor,
        forma_pagamento: 'cartao_credito',
        status: 'pago',
        data_pagamento: new Date(hoje.getTime() - 15 * 24 * 60 * 60 * 1000),
        data_vencimento: new Date(hoje.getTime() - 15 * 24 * 60 * 60 * 1000),
        clinica_id: clinica.id
      }
    }),
    prisma.pagamentos.create({
      data: {
        consulta_id: consultas[2].id,
        valor: procedimentos[3].valor,
        forma_pagamento: 'pix',
        status: 'pendente',
        data_vencimento: new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000),
        clinica_id: clinica.id
      }
    }),
    prisma.pagamentos.create({
      data: {
        consulta_id: consultas[3].id,
        valor: procedimentos[4].valor,
        forma_pagamento: 'cartao_credito',
        status: 'pendente',
        data_vencimento: new Date(hoje.getTime() + 14 * 24 * 60 * 60 * 1000),
        clinica_id: clinica.id
      }
    })
  ]);

  console.log(`✅ Pagamentos criados: ${pagamentos.length}`);

  // Criar odontogramas
  const odontogramas = await Promise.all([
    // Carlos - dente 11 saudável
    prisma.odontogramas.create({
      data: {
        paciente_id: pacientes[0].id,
        dente_num: '11',
        estado: 'sadio',
        observacoes: 'Dente saudável',
        criado_por: usuarios[0].id,
        clinica_id: clinica.id
      }
    }),
    // Carlos - dente 36 com cárie
    prisma.odontogramas.create({
      data: {
        paciente_id: pacientes[0].id,
        dente_num: '36',
        estado: 'cariado',
        faces: {
          oclusal: 'cariado',
          mesial: 'sadio',
          distal: 'sadio',
          vestibular: 'sadio',
          lingual: 'sadio'
        },
        observacoes: 'Cárie na face oclusal',
        criado_por: usuarios[0].id,
        clinica_id: clinica.id
      }
    }),
    // Juliana - dente 21 restaurado
    prisma.odontogramas.create({
      data: {
        paciente_id: pacientes[1].id,
        dente_num: '21',
        estado: 'obturado',
        faces: {
          mesial: 'obturado',
          distal: 'sadio',
          vestibular: 'sadio',
          lingual: 'sadio',
          oclusal: 'sadio'
        },
        observacoes: 'Restauração na face mesial',
        criado_por: usuarios[1].id,
        clinica_id: clinica.id
      }
    })
  ]);

  console.log(`✅ Odontogramas criados: ${odontogramas.length}`);

  console.log('🎉 Seed concluído com sucesso!');
  console.log('');
  console.log('📋 Dados de acesso:');
  console.log(`Admin: admin@odontomaster.com / senha: admin123`);
  console.log(`Recepção: maria@odontomaster.com / senha: recepcao123`);
  console.log('');
  console.log('🔗 Endpoints disponíveis:');
  console.log(`POST /auth/login - Login`);
  console.log(`GET /dashboard - Dashboard geral`);
  console.log(`GET /pacientes - Listar pacientes`);
  console.log(`GET /dentistas - Listar dentistas`);
  console.log(`GET /consultas - Listar consultas`);
  console.log(`GET /odontogramas - Listar odontogramas`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });