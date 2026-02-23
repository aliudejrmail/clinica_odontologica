# Backend OdontoClínica

Backend em Node.js com Fastify para gerenciamento de clínicas odontológicas.

## 🚀 Tecnologias

- **Node.js** com **Fastify** - Framework web de alta performance
- **Prisma ORM** - Mapeamento objeto-relacional
- **PostgreSQL** - Banco de dados relacional
- **JWT** - Autenticação e autorização
- **Zod** - Validação de dados
- **Swagger** - Documentação da API

## 📋 Pré-requisitos

- Node.js 18+ 
- PostgreSQL 14+
- npm ou yarn

## 🔧 Instalação

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. Execute as migrações do banco:
```bash
npm run migrate
```

5. Gere o cliente Prisma:
```bash
npm run generate
```

6. Popule o banco com dados de teste (opcional):
```bash
npm run seed
```

## 🚀 Executando o servidor

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm run migrate
npm run build
npm start
```
(O script `build` gera o cliente Prisma; o servidor é Node.js puro, sem compilação.)

## 📚 Documentação da API

A documentação Swagger está disponível em: `http://localhost:3333/docs`

## 🔐 Autenticação

A API utiliza JWT para autenticação. Inclua o token no header:
```
Authorization: Bearer SEU_TOKEN_JWT
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@odontomaster.com",
  "senha": "admin123"
}
```

## 📋 Endpoints Principais

### Autenticação
- `POST /auth/login` - Login
- `POST /auth/register` - Registrar novo usuário
- `GET /auth/me` - Informações do usuário logado

### Clínicas
- `GET /clinicas` - Listar clínicas
- `POST /clinicas` - Criar clínica
- `GET /clinicas/:id` - Buscar clínica

### Pacientes
- `GET /pacientes` - Listar pacientes
- `POST /pacientes` - Criar paciente
- `PUT /pacientes/:id` - Atualizar paciente
- `GET /pacientes/:id/odontograma` - Odontograma do paciente

### Dentistas
- `GET /dentistas` - Listar dentistas
- `POST /dentistas` - Criar dentista
- `GET /dentistas/:id/disponibilidade` - Verificar disponibilidade

### Consultas
- `GET /consultas` - Listar consultas
- `POST /consultas` - Criar consulta
- `PUT /consultas/:id` - Atualizar consulta
- `PATCH /consultas/:id/status` - Alterar status

### Procedimentos
- `GET /procedimentos` - Listar procedimentos
- `POST /procedimentos` - Criar procedimento
- `GET /procedimentos/estatisticas/mais-utilizados` - Procedimentos mais usados

### Odontograma
- `GET /odontogramas/paciente/:paciente_id` - Odontograma do paciente
- `POST /odontogramas` - Registrar dente
- `PUT /odontogramas/:id` - Atualizar dente

### Pagamentos
- `GET /pagamentos` - Listar pagamentos
- `POST /pagamentos` - Criar pagamento
- `POST /pagamentos/:id/pagar` - Registrar pagamento
- `GET /pagamentos/dashboard/recebiveis` - Dashboard financeiro

### Dashboard
- `GET /dashboard` - Dashboard geral
- `GET /dashboard/dentista` - Dashboard do dentista
- `GET /dashboard/financeiro` - Dashboard financeiro (admin)

## 🛡️ Segurança

- **Helmet** - Headers de segurança
- **CORS** - Controle de origem cruzada
- **Rate Limit** - Limite de requisições
- **JWT** - Tokens seguros
- **Zod** - Validação rigorosa de dados
- **RLS** - Row Level Security no PostgreSQL

## 📊 Performance

- Índices otimizados em colunas frequentemente consultadas
- Paginação em todas as listagens
- Cache de queries frequentes
- Compressão de respostas

## 🧪 Testes

Execute os testes:
```bash
npm test
```

## 📝 Scripts Disponíveis

- `npm run dev` - Executar em modo desenvolvimento
- `npm start` - Executar em produção
- `npm run migrate` - Executar migrações
- `npm run generate` - Gerar cliente Prisma
- `npm run studio` - Abrir Prisma Studio
- `npm run seed` - Popular banco com dados de teste
- `npm run lint` - Executar linter
- `npm run typecheck` - Verificar tipos TypeScript

## 🚨 Logs e Monitoramento

Logs são gerados automaticamente. Em produção, configure um serviço de log como:
- Winston
- Pino
- ElasticSearch
- Grafana

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique os logs do servidor
2. Consulte a documentação Swagger
3. Verifique as variáveis de ambiente
4. Confirme as migrações do banco

## 📄 Licença

Este projeto está sob a licença MIT.