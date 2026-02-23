
const app = require('../server');

describe('Testes de Autenticação', () => {
  afterAll(async () => {
    await app.close();
  });

  test('POST /auth/login deve retornar token para credenciais válidas', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'admin@odontomaster.com',
        senha: 'admin123'
      }
    });

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.payload);
    expect(payload.token).toBeDefined();
    expect(payload.user.email).toBe('admin@odontomaster.com');
  });

  test('POST /auth/login deve falhar para senha incorreta', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'admin@odontomaster.com',
        senha: 'senha_errada'
      }
    });

    expect(response.statusCode).toBe(401);
  });
});
