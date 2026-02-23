# Proposta de implementação do frontend – Odonto Clínica

## 1. Objetivo e escopo

Implementar a interface web do sistema de clínicas odontológicas, consumindo a API existente em `backend` (Fastify, porta 3333), com foco em:

- **Autenticação** (login/registro) e uso de JWT em todas as requisições.
- **Gestão** de pacientes, odontólogos, consultas, procedimentos e pagamentos.
- **Odontograma digital** interativo (padrão ISO 3950).
- **Dashboard** e relatórios conforme role (admin, odontólogo, recepcionista).

O frontend será **multi-tenant por clínica**: o contexto da clínica e do usuário já é tratado no backend via JWT e RLS.

---

## 2. Stack técnica recomendada

| Área | Tecnologia | Motivo |
|------|------------|--------|
| Framework | **Next.js 14** (App Router) | Alinhado ao README do projeto; SSR/SSG opcionais; API routes para proxy se necessário |
| Linguagem | **TypeScript** | Tipagem, melhor DX e alinhamento com a API |
| Estilização | **Tailwind CSS** | Rápido, consistente, fácil manutenção |
| Componentes base | **shadcn/ui** ou **Radix UI** | Acessibilidade, customizável, sem lock-in |
| Estado global | **Zustand** | Leve, simples para auth + preferências; React Query para estado servidor |
| Requisições / cache | **TanStack Query (React Query)** | Cache, refetch, integração com a API REST |
| Formulários | **React Hook Form + Zod** | Validação alinhada ao backend (Zod); menos re-renders |
| Gráficos (dashboard) | **Recharts** ou **Chart.js** | Simples para relatórios e dashboards |
| Roteamento e layout | App Router (`app/`) | Rotas agrupadas por contexto (auth, dashboard, odontograma) |

**Variáveis de ambiente (frontend):**

- `NEXT_PUBLIC_API_URL` – base da API (ex.: `http://localhost:3333` em dev).

---

## 3. Estrutura de pastas proposta

```
frontend/
├── app/
│   ├── (auth)/                    # Grupo: rotas públicas de auth
│   │   ├── layout.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/               # Grupo: área logada
│   │   ├── layout.tsx             # Sidebar + header + provider de auth
│   │   ├── page.tsx               # Dashboard home (por role)
│   │   ├── pacientes/
│   │   │   ├── page.tsx           # Listagem + busca/paginação
│   │   │   ├── novo/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx       # Detalhe do paciente
│   │   │       └── editar/
│   │   │           └── page.tsx
│   │   ├── dentistas/
│   │   │   ├── page.tsx
│   │   │   ├── novo/
│   │   │   └── [id]/
│   │   ├── consultas/
│   │   │   ├── page.tsx           # Calendário/lista
│   │   │   ├── nova/
│   │   │   └── [id]/
│   │   ├── procedimentos/
│   │   │   └── page.tsx
│   │   ├── pagamentos/
│   │   │   └── page.tsx
│   │   └── relatorios/
│   │       └── page.tsx
│   ├── (odontograma)/
│   │   └── paciente/[pacienteId]/
│   │       └── page.tsx           # Odontograma do paciente
│   ├── layout.tsx                 # Root layout (providers, fontes)
│   ├── page.tsx                   # Landing ou redirect para login/dashboard
│   └── api/                       # Opcional: proxy ou webhooks
│       └── ...
├── components/
│   ├── ui/                        # Botões, inputs, cards (shadcn-style)
│   ├── layout/                    # Sidebar, Header, Breadcrumb
│   ├── odontograma/               # Grade de dentes, legenda, formulário de estado
│   ├── forms/                     # Formulários reutilizáveis (PacienteForm, etc.)
│   └── tables/                    # Tabelas com paginação e filtros
├── lib/
│   ├── api.ts                     # Cliente HTTP (base URL + Authorization)
│   ├── auth.ts                    # Leitura do token, logout, usuário
│   └── constants.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useApi.ts                  # Wrapper para React Query + API
│   └── usePagination.ts
├── stores/
│   └── authStore.ts               # Zustand: user, token, setUser, logout
├── types/
│   └── api.ts                     # Tipos espelhando respostas da API
└── .env.local                     # NEXT_PUBLIC_API_URL=
```

---

## 4. Integração com a API do backend

- **Base URL:** `process.env.NEXT_PUBLIC_API_URL` (ex.: `http://localhost:3333`).
- **Autenticação:** header `Authorization: Bearer <token>` em todas as requisições exceto login/register.
- **Login:** `POST /auth/login` com `{ email, senha }`; resposta `{ token, user }`; persistir token (ex.: `localStorage` ou cookie httpOnly se houver backend de sessão).
- **401:** tratar globalmente (ex.: limpar token e redirecionar para `/login`).
- **Paginação:** listagens usam `page`, `limit`, `search`, `ativo` (ex.: pacientes); resposta com `pacientes`, `total`, `page`, `totalPages`.
- **CORS:** backend já aceita origem do frontend (`FRONTEND_URL` em prod); em dev usar `http://localhost:3000` (ou a porta do Next).

Cliente API sugerido (exemplo conceitual):

```ts
// lib/api.ts
const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...options?.headers },
  });
  if (res.status === 401) {
    // logout e redirect /login
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

---

## 5. Autenticação e autorização no frontend

- **Login:** página em `app/(auth)/login/page.tsx`; ao sucesso, salvar `token` e `user` (Zustand + persistência); redirecionar para `/` (dashboard).
- **Rotas protegidas:** layout de `(dashboard)` e `(odontograma)` deve verificar se há token/usuário; se não houver, redirecionar para `/login`.
- **Roles:** exibir no menu apenas itens permitidos (ex.: admin vê relatórios financeiros; odontólogo vê agenda e odontograma). Não substitui validação no backend; apenas UX.
- **Logout:** remover token e user; redirecionar para `/login`.

---

## 6. Módulos e fases de implementação

### Fase 1 – MVP (base)

1. **Projeto Next.js 14 + TypeScript + Tailwind + estrutura de pastas** acima.
2. **Auth:** login e registro (telas + integração com `POST /auth/login`, `POST /auth/register`); persistência de token; layout protegido com redirect.
3. **Cliente API:** `lib/api.ts` com header JWT e tratamento de 401.
4. **Dashboard home:** página inicial logada com `GET /dashboard` ou `/dashboard/dentista` (odontólogo) conforme role; cards resumidos (agenda do dia, avisos).
5. **Pacientes:** listagem (paginação, busca), criar, editar, visualizar (espelhar `GET/POST/PUT /pacientes` e `GET /pacientes/:id`).

### Fase 2 – Operação

6. **Odontólogos:** CRUD (listagem, criar, editar) com `GET/POST/PUT /dentistas`.
7. **Consultas:** listagem e filtros; agendar e editar consulta; alterar status (`PATCH /consultas/:id/status`).
8. **Procedimentos:** listagem e CRUD (`/procedimentos`); uso em consulta (consulta_procedimentos).
9. **Pagamentos:** listagem e registrar pagamento; dashboard financeiro (`GET /pagamentos/dashboard/recebiveis`).

### Fase 3 – Odontograma e relatórios

10. **Odontograma:**  
    - Rota `app/(odontograma)/paciente/[pacienteId]/page.tsx`.  
    - Componente de grade (32 dentes permanentes, ISO 3950); cores/ícones por estado (`sadio`, `cariado`, `obturado`, `ausente`, etc.) e faces (mesial, distal, vestibular, lingual, oclusal).  
    - Consumir `GET /odontogramas/paciente/:paciente_id`, `POST /odontogramas`, `PUT /odontogramas/:id` (conforme contrato real da API).  
    - Formulário para alterar estado de um dente e salvar via API.
11. **Relatórios:** página com gráficos (Recharts) usando `GET /dashboard`, `GET /dashboard/financeiro`, `GET /procedimentos/estatisticas/mais-utilizados`, etc.
12. **Ajustes de UX:** loading, toasts de sucesso/erro, confirmações, responsividade e acessibilidade (labels, contraste, foco).

---

## 7. UI/UX e design system

- **Estilo:** limpo e profissional (clínica); paleta suave com destaque para ações primárias; boa legibilidade.
- **Componentes:** usar base (shadcn/Radix) para acessibilidade (ARIA, teclado, contraste).
- **Responsividade:** layout que funcione em desktop e tablet (odontograma pode exigir área maior).
- **Feedback:** loading em listagens e envio de formulários; mensagens de erro da API exibidas de forma clara; toasts para “salvo com sucesso”.
- **Navegação:** sidebar fixa no dashboard com itens por role; breadcrumb nas telas internas.

---

## 8. Odontograma – detalhamento

- **Padrão:** ISO 3950 (numeração dos 32 dentes permanentes).
- **Representação:** grade visual (superior / inferior, esquerda / direita do paciente); cada dente com número e estado.
- **Estados (ex.: backend):** `sadio`, `cariado`, `obturado`, `ausente`, `extraido`, `implante`, `coroa`, `ponte`, `tratamento`.
- **Faces (opcional):** mesial, distal, vestibular, lingual, oclusal; cada face pode ter estado (ex.: sadio, cariado, obturado).
- **Interação:** clicar no dente abre modal ou painel para escolher estado (e faces); submit chama `POST /odontogramas` ou `PUT /odontogramas/:id` conforme API.
- **Dados:** carregar via `GET /odontogramas/paciente/:paciente_id` e preencher a grade; atualizar estado local após salvar.

---

## 9. Cronograma sugerido (referência)

| Fase | Conteúdo | Estimativa (referência) |
|------|----------|-------------------------|
| Fase 1 | Setup + Auth + API client + Dashboard home + CRUD Pacientes | 2–3 sprints |
| Fase 2 | Dentistas, Consultas, Procedimentos, Pagamentos | 2–3 sprints |
| Fase 3 | Odontograma interativo + Relatórios + polish UX | 2 sprints |

Dependências técnicas: backend rodando e estável; `.env` do frontend com `NEXT_PUBLIC_API_URL` apontando para a API.

---

## 10. Resumo

- **Stack:** Next.js 14 (App Router), TypeScript, Tailwind, shadcn/Radix, Zustand, React Query, RHF + Zod.
- **Estrutura:** pastas por domínio (auth, dashboard, odontograma); componentes em `components/`; API e auth em `lib/` e `stores/`.
- **Integração:** um único cliente HTTP com JWT e tratamento de 401; paginação e filtros alinhados aos query params da API.
- **Entregas em fases:** (1) Base + Auth + Pacientes; (2) Dentistas, Consultas, Procedimentos, Pagamentos; (3) Odontograma e relatórios.

Esta proposta pode ser usada como escopo para implementação incremental do frontend no repositório `odonto_clinica`, mantendo alinhamento com o backend existente e com o README do projeto.
