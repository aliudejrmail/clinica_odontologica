# Frontend Odonto Clínica

Interface web do sistema de clínicas odontológicas (Next.js 14, TypeScript, Tailwind).

## Pré-requisitos

- Node.js 18+
- Backend da API rodando (porta 3333) com banco configurado

## Configuração

1. Instale as dependências:

```powershell
npm install
```

2. Crie o arquivo `.env.local` na raiz do frontend (ou use o existente):

```
NEXT_PUBLIC_API_URL=http://localhost:3333
```

## Desenvolvimento

```powershell
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

- **Login:** use as credenciais do seed do backend (ex.: `admin@odontomaster.com` / `admin123`).

## Build e produção

```powershell
npm run build
npm start
```

## Estrutura principal

- `app/(auth)/` – Login e registro
- `app/(dashboard)/` – Área logada: dashboard, pacientes, odontólogos, consultas, procedimentos, pagamentos, relatórios
- `app/(dashboard)/pacientes/[id]/odontograma` – Odontograma do paciente
- `components/` – UI, layout, formulários, odontograma
- `lib/` – Cliente API, auth, constantes
- `stores/` – Zustand (auth)
- `types/` – Tipos da API

## Scripts

- `npm run dev` – Servidor de desenvolvimento
- `npm run build` – Build de produção
- `npm start` – Servidor de produção
- `npm run lint` – ESLint
