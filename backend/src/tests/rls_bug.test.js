
const app = require('../server');
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

describe('Testes de RLS e Middleware', () => {
  let tokenA;
  let pacienteIdA;

  beforeAll(async () => {
    // Login na Clínica A (seed)
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'admin@odontomaster.com',
        senha: 'admin123'
      }
    });
    tokenA = JSON.parse(loginResponse.payload).token;
  });

  afterAll(async () => {
    // Limpar dados criados
    if (pacienteIdA) {
      // Usar deleteMany para evitar problemas de FK se houver
      await prisma.pacientes.deleteMany({ where: { email: { contains: 'teste.rls' } } });
    }
    await prisma.users.deleteMany({ where: { email: 'adminB@clinicaB.com' } });
    await prisma.clinicas.deleteMany({ where: { cnpj: '99999999000199' } });
    
    await app.close();
  });

  test('Deve criar paciente na Clínica A', async () => {
    const randomCPF = Math.floor(Math.random() * 100000000000).toString().padStart(11, '0');
    
    const response = await app.inject({
      method: 'POST',
      url: '/pacientes',
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: {
        nome: 'Paciente Teste RLS',
        cpf: randomCPF,
        email: `teste.rls.${randomCPF}@email.com`,
        telefone: '11999999999',
        data_nascimento: '1990-01-01',
        endereco: 'Rua Teste, 123 - São Paulo/SP'
      }
    });

    if (response.statusCode !== 201) {
      console.log('Erro ao criar paciente:', response.payload);
    }
    expect(response.statusCode).toBe(201);
    
    const paciente = JSON.parse(response.payload);
    pacienteIdA = paciente.id;
  });

  test('Admin da Clínica B NÃO deve ver paciente da Clínica A', async () => {
    // 1. Criar Clínica B e Admin B
    // Verificar se já existe para evitar erro de unique
    let clinicaB = await prisma.clinicas.findUnique({ where: { cnpj: '99999999000199' } });
    if (!clinicaB) {
      clinicaB = await prisma.clinicas.create({
        data: {
          nome: 'Clínica B',
          cnpj: '99999999000199',
          telefone: '1188888888',
          endereco: 'Rua B'
        }
      });
    }

    const senhaHash = await bcrypt.hash('admin123', 10);
    // Upsert admin B
    const adminB = await prisma.users.upsert({
      where: { email: 'adminB@clinicaB.com' },
      update: {},
      create: {
        email: 'adminB@clinicaB.com',
        password_hash: senhaHash,
        role: 'clinica_admin',
        clinica_id: clinicaB.id
      }
    });

    // 2. Logar como Admin B
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'adminB@clinicaB.com',
        senha: 'admin123'
      }
    });
    const tokenB = JSON.parse(loginResponse.payload).token;

    // 3. Tentar listar pacientes (deve retornar vazio)
    const listResponse = await app.inject({
      method: 'GET',
      url: '/pacientes',
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    
    const pacientesB = JSON.parse(listResponse.payload).pacientes;
    expect(pacientesB).toHaveLength(0); // Clínica B vazia

    // 4. Tentar acessar o paciente A diretamente pelo ID
    const getResponse = await app.inject({
      method: 'GET',
      url: `/pacientes/${pacienteIdA}`, // ID válido, mas de outra clínica
      headers: { Authorization: `Bearer ${tokenB}` }
    });

    // Deve retornar 404 (Não encontrado para esta clínica) ou 403 (Proibido)
    // O Prisma findFirst com filtro retorna null -> 404
    expect(getResponse.statusCode).toBe(404);
  });
});
