const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  try {
    // Verificar se já existe clínica
    let clinica = await prisma.clinicas.findFirst();
    
    if (!clinica) {
      // Criar clínica de teste
      clinica = await prisma.clinicas.create({
        data: {
          nome: 'Clínica OdontoMaster',
          cnpj: '12345678000195',
          telefone: '(11) 98765-4321',
          endereco: 'Rua dos Dentistas, 123, Centro, São Paulo - SP'
        }
      });
      console.log('✅ Clínica criada:', clinica.nome);
    } else {
      console.log('ℹ️ Clínica já existe:', clinica.nome);
    }

    // Verificar se já existem usuários
    const totalUsuarios = await prisma.users.count();
    
    if (totalUsuarios === 0) {
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
    } else {
      console.log('ℹ️ Usuários já existem:', totalUsuarios);
    }

    // Verificar dentistas
    const totalDentistas = await prisma.dentistas.count();
    
    if (totalDentistas === 0) {
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
    } else {
      console.log('ℹ️ Dentistas já existem:', totalDentistas);
    }

    // Verificar procedimentos
    const totalProcedimentos = await prisma.procedimentos.count();
    
    if (totalProcedimentos === 0) {
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
    } else {
      console.log('ℹ️ Procedimentos já existem:', totalProcedimentos);
    }

    // Verificar pacientes
    const totalPacientes = await prisma.pacientes.count();
    
    if (totalPacientes === 0) {
      // Criar pacientes
      const pacientes = await Promise.all([
        prisma.pacientes.create({
          data: {
            clinica_id: clinica.id,
            nome: 'Carlos Eduardo',
            cpf: '12345678901',
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
            cpf: '98765432109',
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
            cpf: '45678912301',
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
            cpf: '32109876543',
            data_nascimento: new Date('1988-12-05'),
            telefone: '(11) 93456-7890',
            email: 'ana@email.com',
            endereco: 'Rua D, 321'
          }
        })
      ]);
      console.log('✅ Pacientes criados:', pacientes.length);
    } else {
      console.log('ℹ️ Pacientes já existem:', totalPacientes);
    }

    console.log('\n🎉 Seed concluído com sucesso!');
    console.log('📊 Resumo:');
    console.log(`   - Clínicas: ${await prisma.clinicas.count()}`);
    console.log(`   - Usuários: ${await prisma.users.count()}`);
    console.log(`   - Dentistas: ${await prisma.dentistas.count()}`);
    console.log(`   - Procedimentos: ${await prisma.procedimentos.count()}`);
    console.log(`   - Pacientes: ${await prisma.pacientes.count()}`);

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