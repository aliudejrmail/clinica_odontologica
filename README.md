# Projeto de Clínica Odontológica - Estrutura Completa

## 📋 Visão Geral
Sistema completo para gerenciamento de clínicas odontológicas com segurança, performance e odontograma digital.

## 🏗️ Arquitetura Recomendada

### Backend: Node.js + TypeScript + Fastify
```
backend/
├── src/
│   ├── routes/           # Rotas API REST
│   │   ├── auth.routes.ts
│   │   ├── pacientes.routes.ts
│   │   ├── consultas.routes.ts
│   │   ├── dentistas.routes.ts
│   │   ├── procedimentos.routes.ts
│   │   ├── odontogramas.routes.ts
│   │   └── relatorios.routes.ts
│   ├── services/       # Lógica de negócio
│   │   ├── auth.service.ts
│   │   ├── paciente.service.ts
│   │   ├── consulta.service.ts
│   │   └── odontograma.service.ts
│   ├── models/         # Entidades Prisma
│   │   └── schema.prisma
│   ├── middleware/     # Auth, validação, RLS
│   │   ├── auth.middleware.ts
│   │   ├── rls.middleware.ts
│   │   └── validation.middleware.ts
│   ├── utils/          # Utilitários
│   │   ├── database.ts
│   │   ├── logger.ts
│   │   └── security.ts
│   └── types/          # TypeScript types
├── prisma/              # Migrations e seed
├── tests/               # Testes unitários
├── docs/                # Documentação API
└── docker-compose.yml   # PostgreSQL + pgAdmin
```

### Frontend: Next.js 14 + TypeScript
```
frontend/
├── app/                 # App Router Next.js 14
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── pacientes/
│   │   ├── consultas/
│   │   ├── dentistas/
│   │   └── relatorios/
│   ├── (odontograma)/
│   │   └── [patientId]/
│   └── api/            # API routes do Next.js
├── components/
│   ├── ui/            # Componentes UI
│   ├── odontograma/   # Componentes odontograma
│   ├── forms/         # Formulários
│   └── tables/        # Tabelas de dados
├── lib/               # Utilitários e config
├── hooks/             # React hooks customizados
├── stores/            # Estado global (Zustand)
└── types/             # TypeScript types
```

## 📊 Scripts SQL Implementados

### 1. Segurança com RLS (`database/security/rls_setup.sql`)
- ✅ Multi-tenant com isolamento por clínica
- ✅ Controle de acesso por role (admin, dentista, recepcionista, paciente)
- ✅ Row Level Security em todas as tabelas
- ✅ Auditoria de acessos

### 2. Backup com WAL Archiving (`database/backup/backup_setup.sh`)
- ✅ Backup diário automático
- ✅ WAL archiving para point-in-time recovery
- ✅ Retenção de 30 dias
- ✅ Teste de integridade
- ✅ Notificações de falha

### 3. Índices Otimizados (`database/performance/indices_otimizados.sql`)
- ✅ Índices para consultas frequentes (CPF, data, status)
- ✅ Índices compostos para relatórios
- ✅ Índices GIN para JSONB
- ✅ Full-text search para nomes
- ✅ Índices para RLS (performance crítica)

### 4. Odontograma com JSONB (`database/odontograma/sistema_odontograma.sql`)
- ✅ Estrutura ISO 3950 (32 dentes permanentes)
- ✅ Estados por dente e face
- ✅ Auditoria de mudanças
- ✅ Funções para manipulação
- ✅ Queries de análise

## 🚀 Implementação Backend (Node.js)

### package.json
```json
{
  "name": "odonto-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsup src",
    "start": "node dist/server.js",
    "migrate": "prisma migrate deploy",
    "seed": "tsx src/scripts/seed.ts",
    "test": "vitest",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@fastify/cors": "^8.4.0",
    "@fastify/helmet": "^11.1.1",
    "@fastify/jwt": "^7.2.4",
    "@fastify/rate-limit": "^8.0.3",
    "@fastify/swagger": "^8.12.0",
    "@fastify/swagger-ui": "^2.1.0",
    "@prisma/client": "^5.6.0",
    "bcrypt": "^5.1.1",
    "dotenv": "^16.3.1",
    "fastify": "^4.24.3",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/node": "^20.8.10",
    "eslint": "^8.53.0",
    "prisma": "^5.6.0",
    "tsup": "^7.2.0",
    "tsx": "^4.1.2",
    "typescript": "^5.2.2",
    "vitest": "^0.34.6"
  }
}
```

### Configuração Prisma (schema.prisma)
```prisma
// Este arquivo deve ser gerado a partir do SQL de segurança RLS
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model clinicas {
  id         Int      @id @default(autoincrement())
  nome       String   @db.VarChar(255)
  cnpj       String   @unique @db.VarChar(14)
  created_at DateTime @default(now())
  
  pacientes    pacientes[]
  dentistas    dentistas[]
  consultas    consultas[]
  procedimentos procedimentos[]
  odontogramas odontogramas[]
  pagamentos   pagamentos[]
  users        users[]
}

model users {
  id            String   @id @default(uuid())
  email         String   @unique @db.VarChar(255)
  password_hash String   @db.VarChar(255)
  role          String   @db.VarChar(50)
  clinica_id    Int
  dentista_id   Int?
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt
  
  clinica   clinicas @relation(fields: [clinica_id], references: [id], onDelete: Cascade)
  dentista  dentistas? @relation(fields: [dentista_id], references: [id])
  
  @@index([clinica_id])
  @@index([dentista_id])
}

model pacientes {
  id              Int      @id @default(autoincrement())
  clinica_id      Int
  nome            String   @db.VarChar(255)
  cpf             String   @unique @db.VarChar(11)
  data_nascimento DateTime @db.Date
  telefone        String?  @db.VarChar(20)
  email           String?  @db.VarChar(255)
  endereco        String?  @db.Text
  responsavel_nome String? @db.VarChar(255)
  responsavel_cpf String?  @db.VarChar(11)
  responsavel_telefone String? @db.VarChar(20)
  observacoes     String?  @db.Text
  ativo           Boolean  @default(true)
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  
  clinica     clinicas @relation(fields: [clinica_id], references: [id], onDelete: Cascade)
  consultas   consultas[]
  odontogramas odontogramas[]
  
  @@index([clinica_id])
  @@index([cpf])
  @@index([nome])
}

model dentistas {
  id            Int      @id @default(autoincrement())
  clinica_id    Int
  nome          String   @db.VarChar(255)
  cro           String   @db.VarChar(50)
  especialidade String?  @db.VarChar(100)
  telefone      String?  @db.VarChar(20)
  email         String?  @db.VarChar(255)
  ativo         Boolean  @default(true)
  created_at    DateTime @default(now())
  
  clinica     clinicas @relation(fields: [clinica_id], references: [id], onDelete: Cascade)
  consultas   consultas[]
  odontogramas odontogramas[]
  users       users[]
  
  @@unique([cro, clinica_id])
  @@index([clinica_id])
  @@index([cro])
}

model consultas {
  id              Int      @id @default(autoincrement())
  clinica_id      Int
  paciente_id     Int
  dentista_id     Int
  data_hora       DateTime
  duracao_minutos Int      @default(60)
  status          String   @db.VarChar(50)
  tipo_consulta   String   @db.VarChar(100)
  observacoes     String?  @db.Text
  valor_total     Decimal? @db.Decimal(10, 2)
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  
  clinica      clinicas @relation(fields: [clinica_id], references: [id], onDelete: Cascade)
  paciente     pacientes @relation(fields: [paciente_id], references: [id], onDelete: Cascade)
  dentista     dentistas @relation(fields: [dentista_id], references: [id], onDelete: Cascade)
  procedimentos consulta_procedimentos[]
  pagamentos   pagamentos[]
  
  @@index([clinica_id])
  @@index([paciente_id])
  @@index([dentista_id])
  @@index([data_hora])
  @@index([status])
}

model procedimentos {
  id          Int      @id @default(autoincrement())
  clinica_id  Int
  codigo      String   @db.VarChar(50)
  nome        String   @db.VarChar(255)
  descricao   String?  @db.Text
  valor_base  Decimal? @db.Decimal(10, 2)
  ativo       Boolean  @default(true)
  created_at  DateTime @default(now())
  
  clinica      clinicas @relation(fields: [clinica_id], references: [id], onDelete: Cascade)
  procedimentos consulta_procedimentos[]
  
  @@unique([codigo, clinica_id])
  @@index([clinica_id])
  @@index([codigo])
}

model consulta_procedimentos {
  id               Int      @id @default(autoincrement())
  consulta_id      Int
  procedimento_id  Int
  dente_numero     Int?
  face             String?  @db.VarChar(10)
  quantidade       Int      @default(1)
  valor_unitario   Decimal? @db.Decimal(10, 2)
  valor_total      Decimal? @db.Decimal(10, 2)
  observacoes      String?  @db.Text
  created_at       DateTime @default(now())
  
  consulta    consultas @relation(fields: [consulta_id], references: [id], onDelete: Cascade)
  procedimento procedimentos @relation(fields: [procedimento_id], references: [id], onDelete: Cascade)
  
  @@index([consulta_id])
  @@index([procedimento_id])
  @@index([dente_numero])
}

model odontogramas {
  id              Int      @id @default(autoincrement())
  clinica_id      Int
  paciente_id     Int
  dentista_id     Int
  data_avaliacao  DateTime @db.Date
  estado_dentes   Json
  observacoes     String?  @db.Text
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  
  clinica   clinicas @relation(fields: [clinica_id], references: [id], onDelete: Cascade)
  paciente  pacientes @relation(fields: [paciente_id], references: [id], onDelete: Cascade)
  dentista  dentistas @relation(fields: [dentista_id], references: [id], onDelete: Cascade)
  
  @@index([clinica_id])
  @@index([paciente_id])
  @@index([dentista_id])
  @@index([data_avaliacao])
}

model pagamentos {
  id               Int      @id @default(autoincrement())
  clinica_id       Int
  consulta_id      Int
  forma_pagamento  String   @db.VarChar(50)
  valor            Decimal  @db.Decimal(10, 2)
  data_pagamento   DateTime @default(now())
  parcelas         Int      @default(1)
  observacoes      String?  @db.Text
  created_at       DateTime @default(now())
  
  clinica   clinicas @relation(fields: [clinica_id], references: [id], onDelete: Cascade)
  consulta  consultas @relation(fields: [consulta_id], references: [id], onDelete: Cascade)
  
  @@index([clinica_id])
  @@index([consulta_id])
  @@index([data_pagamento])
}
```

## 🔐 Segurança Implementada

### 1. Row Level Security (RLS)
- Isolamento completo por clínica
- Controle granular por usuário
- Auditoria de acessos
- Proteção contra acesso cruzado

### 2. Backup e Recuperação
- Backup diário automático
- WAL archiving para PITR
- Testes de integridade
- Retenção configurável

### 3. Performance
- Índices otimizados para consultas frequentes
- Índices GIN para JSONB
- Particionamento para dados históricos
- Cache de consultas frequentes

### 4. Odontograma Digital
- Estrutura ISO 3950 completa
- Estados por dente e face
- Auditoria de mudanças
- Visualização interativa

## 🚀 Próximos Passos

1. **Implementar Backend Node.js**
   - Configurar Fastify com TypeScript
   - Implementar autenticação JWT
   - Criar serviços de negócio
   - Configurar Prisma com RLS

2. **Desenvolver Frontend**
   - Criar interface com Next.js 14
   - Implementar odontograma interativo
   - Sistema de agendamento
   - Dashboard de relatórios

3. **Testes e Deploy**
   - Testes unitários e de integração
   - Configurar CI/CD
   - Deploy com Docker
   - Monitoramento e logs

## 📚 Documentação Adicional

- [Documentação PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Fastify Documentation](https://www.fastify.io/docs/)
- [Next.js Documentation](https://nextjs.org/docs)