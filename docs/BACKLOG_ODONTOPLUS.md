# Backlog inspirado no OdontoPlus

Referência: [OdontoPlus – Netsource](https://netsource.com.br/odontoplus/) (gerenciador de clínicas odontológicas). Este documento mapeia as funcionalidades do OdontoPlus para o nosso projeto e propõe o que já temos e o que pode ser implementado, **sem copiar telas ou design** — apenas equivalentes funcionais na nossa stack (Next.js + Fastify + PostgreSQL).

---

## Comparativo: OdontoPlus x Odonto Clínica

| Funcionalidade OdontoPlus | No nosso projeto | Ação sugerida |
|---------------------------|------------------|----------------|
| **Cadastro de pacientes** | ✅ Pacientes (CRUD, busca, paginação) | — |
| **Agenda de pacientes e consultas** | ✅ Consultas (lista, nova, detalhe); falta visão calendário | Melhorar: agenda em calendário (semana/mês) |
| **Contas a receber** | ✅ Pagamentos (lista, vinculado a consultas) | Opcional: filtros por vencimento, dashboard recebíveis |
| **Contas a pagar** | ❌ Não existe | **Implementar:** módulo contas a pagar (fornecedores, despesas) |
| **Odontograma** | ✅ Odontograma digital (ISO 3950), história clínica | — |
| **Anamnese com perguntas pré-cadastradas** | ❌ Não existe | **Implementar:** anamnese por paciente (perguntas + respostas) |
| **Relatórios** (contas a pagar/receber, recibos, odontograma, serviços, consultas, pacientes, aniversariantes, etiquetas) | ✅ Parcial: dashboard + relatórios (consultas por status/mês, procedimentos) | **Implementar:** aniversariantes, recibos (PDF), etiquetas (opcional) |
| **Acesso em rede / multi-usuário** | ✅ Multi-tenant por clínica, roles (admin, dentista, recepcionista) | — |
| **Permissões por administrador** | ✅ JWT + role no backend | Opcional: tela de gestão de usuários/permissões |

---

## Funcionalidades que podemos implementar

### 1. Agenda em formato calendário (consultas)

- **Objetivo:** Ver consultas em calendário (semana ou mês), como no OdontoPlus.
- **Onde:** Frontend: nova view em `/dashboard/consultas` (abas: Lista | Calendário). Backend: já temos `GET /consultas` com filtros `data_inicio`/`data_fim`.
- **Esforço:** Médio (componente de calendário, ex.: FullCalendar ou react-big-calendar).

### 2. Contas a pagar

- **Objetivo:** Controle de despesas da clínica (fornecedores, aluguel, etc.) com vencimento e status.
- **Onde:** Novo módulo: tabela `contas_pagar` (ou similar), rotas `GET/POST/PUT /contas-pagar`, tela no dashboard.
- **Esforço:** Médio (backend + CRUD + listagem com filtros).

### 3. Anamnese (perguntas pré-cadastradas + respostas por paciente)

- **Objetivo:** Perguntas padrão (sim/não, texto) e registro das respostas por paciente, com data.
- **Onde:** Tabelas `anamnese_perguntas` (clínica ou global) e `anamnese_respostas` (paciente_id, pergunta_id, valor, data). Rotas CRUD perguntas + GET/POST respostas por paciente. Frontend: seção na ficha do paciente ou página “Anamnese”.
- **Esforço:** Médio-alto.

### 4. Relatório de aniversariantes

- **Objetivo:** Lista de pacientes que fazem aniversário no mês (ou na semana).
- **Onde:** Backend: `GET /pacientes/aniversariantes?mes=1` (ou `data_inicio`/`data_fim`). Frontend: página ou card no dashboard “Aniversariantes do mês”.
- **Esforço:** Baixo.

### 5. Recibos (PDF)

- **Objetivo:** Gerar recibo de pagamento/consulta em PDF para download ou impressão.
- **Onde:** Backend: lib (ex.: PDFKit ou Puppeteer) para gerar PDF; rota `GET /pagamentos/:id/recibo` ou `GET /consultas/:id/recibo`. Frontend: botão “Emitir recibo” na tela de pagamento ou consulta.
- **Esforço:** Médio.

### 6. Etiquetas de endereçamento (opcional)

- **Objetivo:** Exportar ou imprimir etiquetas com endereço dos pacientes (para correspondência).
- **Onde:** Backend: endpoint que retorna lista de endereços (ou PDF com etiquetas). Frontend: tela “Relatórios > Etiquetas”, filtros (ex.: todos ou por convênio) e botão imprimir/exportar.
- **Esforço:** Médio.

### 7. Contas a receber com vencimento e dashboard

- **Objetivo:** Deixar explícito “a receber por vencimento” e valor total recebível (como no OdontoPlus).
- **Onde:** Backend: já existe `GET /pagamentos/dashboard/recebiveis` (verificar se retorna por vencimento). Frontend: card ou seção “A receber” no dashboard e filtros por data de vencimento na lista de pagamentos.
- **Esforço:** Baixo a médio (depende do que a API já expõe).

---

## Priorização sugerida

| Prioridade | Item | Motivo |
|------------|------|--------|
| 1 | Agenda em calendário | Uso diário da equipe; já temos dados. |
| 2 | Aniversariantes do mês | Rápido; melhora relacionamento com paciente. |
| 3 | Anamnese | Diferencial clínico; exige modelo de dados novo. |
| 4 | Contas a pagar | Equilibra gestão financeira (receber + pagar). |
| 5 | Recibos em PDF | Atende exigência de documentação. |
| 6 | Etiquetas | Útil se a clínica envia correspondência. |

---

## Observação legal e de produto

- As **telas e o design** do OdontoPlus são de autoria da Netsource; não devemos copiá-los. Podemos apenas implementar **equivalentes funcionais** (cadastro, agenda, contas a pagar/receber, anamnese, relatórios, etc.) com o nosso layout e fluxo.
- O OdontoPlus é desktop (Windows, Access); nosso projeto é **web** (Next.js + API), o que permite acesso em rede e de qualquer dispositivo, alinhado ao que o OdontoPlus descreve como “acesso em rede”.

Se quiser, podemos detalhar a implementação de um desses itens (por exemplo: agenda em calendário ou aniversariantes) em tarefas técnicas no repositório.
