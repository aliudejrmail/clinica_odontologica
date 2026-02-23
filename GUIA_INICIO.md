# Guia para iniciar a aplicação Odonto Clínica

## Resumo da análise do projeto

- **Backend:** Node.js + Fastify + Prisma + PostgreSQL (pasta `backend/`).
- **Frontend:** Não existe ainda; o README principal descreve um frontend Next.js 14 que não foi criado.
- **Banco:** PostgreSQL com schema gerenciado pelo Prisma (migrações na pasta `backend/prisma/migrations/`).

---

## O que é necessário para subir apenas o backend

### 1. Pré-requisitos instalados

- **Node.js 18+**
- **PostgreSQL 14+** instalado e em execução
- **npm** (ou yarn)

### 2. Banco de dados PostgreSQL

1. Crie um banco chamado `odonto` (ou use o que estiver em `DATABASE_URL` no `.env`).
2. A primeira migração já habilita a extensão `uuid-ossp` no PostgreSQL (necessária para os campos UUID).

Exemplo no `psql`:

```sql
CREATE DATABASE odonto;
\c odonto
-- A extensão será criada pela migração; se quiser criar manualmente:
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 3. Variáveis de ambiente

O arquivo `backend/.env` já existe. Confira se está assim (ajuste usuário/senha/porta se precisar):

- `DATABASE_URL` – conexão com o PostgreSQL (ex.: `postgresql://postgres:SENHA@localhost:5432/odonto`)
- `JWT_SECRET` – chave para tokens JWT
- `PORT` – porta do servidor (padrão 3333)

Se não tiver `.env`, copie o exemplo:

```powershell
cd backend
Copy-Item .env.example .env
# Edite .env com suas configurações
```

### 4. Dependências e Prisma

No PowerShell, na raiz do backend:

```powershell
cd c:\projetos_web\odonto_clinica\backend
npm install
npx prisma generate
```

### 5. Migrações (criar tabelas)

Aplicar as migrações existentes (inclui a migração inicial `20250222000000_init`):

```powershell
npm run migrate
```

Ou diretamente:

```powershell
npx prisma migrate deploy
```

Se for o primeiro uso e o banco estiver vazio, isso cria todas as tabelas.

### 6. Dados iniciais (opcional)

Para ter clínica e usuários de teste (admin, dentista, recepcionista):

```powershell
npm run seed
```

Credenciais de exemplo (conforme seed):

- **Admin:** `admin@odontomaster.com` / `admin123`
- **Dentista:** `dentista@odontomaster.com` / `admin123`
- **Recepcionista:** `recepcao@odontomaster.com` / `admin123`

### 7. Subir o servidor

```powershell
npm run dev
```

- API: `http://localhost:3333`
- Documentação Swagger: `http://localhost:3333/docs`
- Health: `http://localhost:3333/health`

---

## Checklist rápido

| Etapa | Comando / ação |
|-------|-----------------|
| 1. PostgreSQL rodando e banco `odonto` criado | Manual |
| 2. `.env` configurado em `backend/` | Copiar de `.env.example` se necessário |
| 3. Instalar dependências | `npm install` (em `backend/`) |
| 4. Gerar cliente Prisma | `npm run generate` ou `npx prisma generate` |
| 5. Aplicar migrações | `npm run migrate` ou `npx prisma migrate deploy` |
| 6. (Opcional) Popular dados de teste | `npm run seed` |
| 7. Iniciar API | `npm run dev` |

---

## O que ainda não existe no projeto

1. **Frontend**  
   O README descreve um frontend Next.js 14 (App Router, dashboard, odontograma). A pasta `frontend/` não existe; a aplicação hoje é só a API.

2. **Script de build no backend**  
   O `package.json` do backend não tem script `build`. Para produção basta usar `npm start` (executa `node src/server.js`). O README do backend menciona `npm run build`; isso pode ser removido ou adicionado como script vazio/alias.

3. **Docker**  
   O README principal cita `docker-compose.yml` para PostgreSQL e pgAdmin; esse arquivo não está na raiz do repositório. Quem quiser pode criar um `docker-compose.yml` depois para subir o Postgres.

---

## Possíveis erros ao iniciar

- **Erro de conexão com o banco**  
  Verifique se o PostgreSQL está rodando, se o banco `odonto` existe e se `DATABASE_URL` no `.env` está correto (usuário, senha, host, porta).

- **`uuid_generate_v4` não existe**  
  A migração inicial já inclui `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`. Se o erro persistir, execute manualmente no banco:  
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`

- **Migração já aplicada / conflito**  
  Se o banco já tiver tabelas criadas por outro meio (ex.: `prisma db push`), pode ser necessário alinhar o histórico de migrações ou usar um banco novo para testar.

---

## Próximos passos sugeridos

1. Subir o backend conforme o checklist e testar a API em `http://localhost:3333/docs`.
2. Criar o frontend (ex.: Next.js 14) na pasta `frontend/` quando for desenvolver a interface.
3. Ajustar o README do backend para remover ou corrigir a menção a `npm run build` conforme o uso real.
