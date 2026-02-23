const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { encrypt } = require('../lib/cpfCrypto');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  try {
    // Criar clínica de teste
    const clinica = await prisma.clinicas.create({
      data: {
        nome: 'Clínica OdontoMaster',
        cnpj: '12345678000195',
        telefone: '(11) 98765-4321',
        endereco: 'Rua dos Dentistas, 123, Centro, São Paulo - SP'
      }
    });
    console.log('✅ Clínica criada:', clinica.nome);

    // Criar usuários de teste
    const senhaHash = await bcrypt.hash('admin123', 10);
    
    const usuarios = await Promise.all([
      // Admin
      prisma.users.create({
        data: {
          email: 'admin@odontomaster.com',
          password_hash: senhaHash,
          role: 'clinica_admin'
        }
      }),
      // Dentista
      prisma.users.create({
        data: {
          email: 'dentista@odontomaster.com',
          password_hash: senhaHash,
          role: 'dentista'
        }
      }),
      // Recepcionista
      prisma.users.create({
        data: {
          email: 'recepcao@odontomaster.com',
          password_hash: senhaHash,
          role: 'recepcionista'
        }
      })
    ]);
    console.log('✅ Usuários criados:', usuarios.length);

    // Criar dentistas
    const dentistas = await Promise.all([
      prisma.dentistas.create({
        data: {
          clinica_id: clinica.id,
          nome: 'Dr. Carlos Silva',
          cro: 'SP12345',
          especialidade: 'Ortodontia',
          telefone: '(11) 91234-5678',
          email: 'carlos@odontomaster.com'
        }
      }),
      prisma.dentistas.create({
        data: {
          clinica_id: clinica.id,
          nome: 'Dra. Ana Santos',
          cro: 'SP67890',
          especialidade: 'Endodontia',
          telefone: '(11) 98765-4321',
          email: 'ana@odontomaster.com'
        }
      })
    ]);
    console.log('✅ Dentistas criados:', dentistas.length);

    // Criar procedimentos
    const procedimentos = await Promise.all([
      prisma.procedimentos.create({
        data: {
          clinica_id: clinica.id,
          nome: 'Consulta de Rotina',
          descricao: 'Consulta odontológica de rotina',
          valor: 150.00,
          duracao_min: 30
        }
      }),
      prisma.procedimentos.create({
        data: {
          clinica_id: clinica.id,
          nome: 'Limpeza Dental',
          descricao: 'Limpeza e profilaxia',
          valor: 200.00,
          duracao_min: 45
        }
      }),
      prisma.procedimentos.create({
        data: {
          clinica_id: clinica.id,
          nome: 'Restauração',
          descricao: 'Restauração de cárie',
          valor: 300.00,
          duracao_min: 60
        }
      }),
      prisma.procedimentos.create({
        data: {
          clinica_id: clinica.id,
          nome: 'Extração',
          descricao: 'Extração dentária',
          valor: 400.00,
          duracao_min: 60
        }
      }),
      prisma.procedimentos.create({
        data: {
          clinica_id: clinica.id,
          nome: 'Clareamento',
          descricao: 'Clareamento dental',
          valor: 800.00,
          duracao_min: 90
        }
      })
    ]);
    console.log('✅ Procedimentos criados:', procedimentos.length);

    // Criar pacientes
    const pacientes = await Promise.all([
      prisma.pacientes.create({
        data: {
          clinica_id: clinica.id,
          nome: 'Carlos Eduardo',
          cpf: encrypt('12345678901'),
          data_nascimento: new Date('1990-05-15'),
          telefone: '(11) 91234-5678',
          email: 'carlos@email.com',
          endereco: 'Rua A, 123',
          observacoes: 'Paciente novo'
        }
      }),
      prisma.pacientes.create({
        data: {
          clinica_id: clinica.id,
          nome: 'Maria Silva',
          cpf: encrypt('98765432109'),
          data_nascimento: new Date('1985-08-22'),
          telefone: '(11) 98765-4321',
          email: 'maria@email.com',
          endereco: 'Rua B, 456',
          observacoes: 'Alergia a anestesia'
        }
      }),
      prisma.pacientes.create({
        data: {
          clinica_id: clinica.id,
          nome: 'João Santos',
          cpf: encrypt('45678912301'),
          data_nascimento: new Date('1992-03-10'),
          telefone: '(11) 99876-5432',
          email: 'joao@email.com',
          endereco: 'Rua C, 789'
        }
      }),
      prisma.pacientes.create({
        data: {
          clinica_id: clinica.id,
          nome: 'Ana Paula',
          cpf: encrypt('32109876543'),
          data_nascimento: new Date('1988-12-05'),
          telefone: '(11) 93456-7890',
          email: 'ana@email.com',
          endereco: 'Rua D, 321'
        }
      })
    ]);
    console.log('✅ Pacientes criados:', pacientes.length);

    // Criar consultas
    const hoje = new Date();
    const consultas = await Promise.all([
      prisma.consultas.create({
        data: {
          clinica_id: clinica.id,
          paciente_id: pacientes[0].id,
          dentista_id: dentistas[0].id,
          data_consulta: new Date(hoje.getTime() + 24 * 60 * 60 * 1000), // amanhã
          hora_inicio: '09:00',
          hora_fim: '09:30',
          status: 'agendada',
          tipo: 'consulta',
          valor_total: 150.00,
          observacoes: 'Primeira consulta'
        }
      }),
      prisma.consultas.create({
        data: {
          clinica_id: clinica.id,
          paciente_id: pacientes[1].id,
          dentista_id: dentistas[1].id,
          data_consulta: new Date(hoje.getTime() + 2 * 24 * 60 * 60 * 1000), // depois de amanhã
          hora_inicio: '10:00',
          hora_fim: '11:00',
          status: 'agendada',
          tipo: 'tratamento',
          valor_total: 300.00,
          observacoes: 'Restauração molar'
        }
      }),
      prisma.consultas.create({
        data: {
          clinica_id: clinica.id,
          paciente_id: pacientes[2].id,
          dentista_id: dentistas[0].id,
          data_consulta: new Date(hoje.getTime() - 24 * 60 * 60 * 1000), // ontem
          hora_inicio: '14:00',
          hora_fim: '14:30',
          status: 'concluida',
          tipo: 'consulta',
          valor_total: 200.00,
          observacoes: 'Limpeza realizada'
        }
      }),
      prisma.consultas.create({
        data: {
          clinica_id: clinica.id,
          paciente_id: pacientes[3].id,
          dentista_id: dentistas[1].id,
          data_consulta: new Date(hoje.getTime() + 3 * 24 * 60 * 60 * 1000),
          hora_inicio: '15:00',
          hora_fim: '16:30',
          status: 'agendada',
          tipo: 'tratamento',
          valor_total: 400.00,
          observacoes: 'Extração do terceiro molar'
        }
      })
    ]);
    console.log('✅ Consultas criadas:', consultas.length);

    // Criar pagamentos
    const pagamentos = await Promise.all([
      prisma.pagamentos.create({
        data: {
          clinica_id: clinica.id,
          consulta_id: consultas[2].id, // consulta concluída
          valor: 200.00,
          forma_pagamento: 'dinheiro',
          status: 'pago',
          data_pagamento: new Date(hoje.getTime() - 24 * 60 * 60 * 1000)
        }
      }),
      prisma.pagamentos.create({
        data: {
          clinica_id: clinica.id,
          consulta_id: consultas[0].id,
          valor: 150.00,
          forma_pagamento: 'cartao_credito',
          status: 'pendente',
          data_vencimento: new Date(hoje.getTime() + 24 * 60 * 60 * 1000)
        }
      }),
      prisma.pagamentos.create({
        data: {
          clinica_id: clinica.id,
          consulta_id: consultas[1].id,
          valor: 300.00,
          forma_pagamento: 'pix',
          status: 'pendente',
          data_vencimento: new Date(hoje.getTime() + 2 * 24 * 60 * 60 * 1000)
        }
      }),
      prisma.pagamentos.create({
        data: {
          clinica_id: clinica.id,
          consulta_id: consultas[3].id,
          valor: 400.00,
          forma_pagamento: 'cartao_debito',
          status: 'pendente',
          data_vencimento: new Date(hoje.getTime() + 3 * 24 * 60 * 60 * 1000)
        }
      })
    ]);
    console.log('✅ Pagamentos criados:', pagamentos.length);

    // Criar odontogramas
    const odontogramas = await Promise.all([
      // Carlos - dente 11 saudável
      prisma.odontogramas.create({
        data: {
          clinica_id: clinica.id,
          paciente_id: pacientes[0].id,
          dente_num: '11',
          estado: 'sadio',
          observacoes: 'Dente saudável',
          criado_por: usuarios[0].id
        }
      }),
      // Carlos - dente 36 com cárie
      prisma.odontogramas.create({
        data: {
          clinica_id: clinica.id,
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
          criado_por: usuarios[0].id
        }
      }),
      // Maria - dente 26 restaurado
      prisma.odontogramas.create({
        data: {
          clinica_id: clinica.id,
          paciente_id: pacientes[1].id,
          dente_num: '26',
          estado: 'obturado',
          faces: {
            oclusal: 'obturado',
            mesial: 'sadio',
            distal: 'sadio',
            vestibular: 'sadio',
            lingual: 'sadio'
          },
          observacoes: 'Restauração antiga',
          criado_por: usuarios[0].id
        }
      })
    ]);
    console.log('✅ Odontogramas criados:', odontogramas.length);

    console.log('\n🎉 Seed concluído com sucesso!');
    console.log('📊 Resumo:');
    console.log(`   - Clínicas: 1`);
    console.log(`   - Usuários: ${usuarios.length}`);
    console.log(`   - Dentistas: ${dentistas.length}`);
    console.log(`   - Procedimentos: ${procedimentos.length}`);
    console.log(`   - Pacientes: ${pacientes.length}`);
    console.log(`   - Consultas: ${consultas.length}`);
    console.log(`   - Pagamentos: ${pagamentos.length}`);
    console.log(`   - Odontogramas: ${odontogramas.length}`);

  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('\n✅ Seed finalizado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro no seed:', error);
    process.exit(1);
  });