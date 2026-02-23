
const app = require('../server');

describe('Testes de Saúde da API', () => {
  afterAll(async () => {
    await app.close();
  });

  test('GET / deve retornar mensagem de boas-vindas', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/'
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({
      message: 'API Odonto Clínica - Backend',
      version: '1.0.0',
      docs: '/docs'
    });
  });

  test('GET /health deve retornar status ok', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.payload);
    expect(payload.status).toBe('ok');
    expect(payload.environment).toBeDefined();
  });
});
