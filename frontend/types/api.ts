export interface User {
  id: string;
  email: string;
  role: string;
  clinica_id: number | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Paciente {
  id: number;
  nome: string;
  cpf: string;
  data_nascimento?: string;
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  responsavel_nome?: string | null;
  responsavel_cpf?: string | null;
  responsavel_telefone?: string | null;
  observacoes?: string | null;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PacientesResponse {
  pacientes: Paciente[];
  total: number;
  page: number;
  totalPages: number;
}

export interface Aniversariante {
  id: number;
  nome: string;
  data_nascimento: string;
  telefone?: string | null;
  email?: string | null;
}

export interface AniversariantesResponse {
  aniversariantes: Aniversariante[];
}

export interface Dentista {
  id: number;
  nome: string;
  cro: string;
  especialidade?: string | null;
  telefone?: string | null;
  email?: string | null;
  ativo?: boolean;
  created_at?: string;
}

export interface DentistasResponse {
  dentistas: Dentista[];
  total: number;
  page: number;
  totalPages: number;
}

export interface Consulta {
  id: number;
  data_hora?: string;
  data_consulta?: string;
  hora_inicio?: string;
  hora_fim?: string;
  duracao_minutos?: number;
  status: string;
  tipo_consulta?: string;
  tipo?: string;
  observacoes?: string | null;
  valor_total?: number | string | null;
  paciente_id?: number;
  dentista_id?: number;
  paciente?: { id: number; nome: string; cpf?: string; telefone?: string };
  dentista?: { id: number; nome: string; cro?: string };
  procedimentos?: ConsultaProcedimento[];
}

export interface ConsultaProcedimento {
  id: number;
  dente?: string;
  face?: string;
  valor?: number;
  desconto?: number;
  observacoes?: string;
  procedimento?: { id: number; nome: string; descricao?: string };
}

export interface ConsultasResponse {
  consultas: Consulta[];
  total: number;
  page: number;
  totalPages: number;
}

export interface Procedimento {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string | null;
  valor_base?: number | string | null;
  ativo?: boolean;
}

export interface ProcedimentosResponse {
  procedimentos: Procedimento[];
  total?: number;
  page?: number;
  totalPages?: number;
}

export interface Pagamento {
  id: number;
  consulta_id: number;
  forma_pagamento: string;
  valor: number | string;
  data_pagamento: string;
  parcelas?: number;
  observacoes?: string | null;
  status?: string;
}

export interface PagamentosResponse {
  pagamentos: Pagamento[];
  total?: number;
  page?: number;
  totalPages?: number;
}

export interface DashboardResumo {
  resumo: {
    total_pacientes: number;
    total_consultas: number;
    total_dentistas: number;
    total_receita: number;
  };
  consultas_por_mes: { mes: string; quantidade: number }[];
  consultas_por_status: { status: string; quantidade: number }[];
  top_procedimentos: { nome: string; quantidade: number }[];
}

export interface OdontogramaPaciente {
  paciente: { id: number; nome: string; cpf: string };
  dentes: Array<{
    dente_num: string;
    estado: string;
    faces?: Record<string, string>;
    observacoes?: string;
    data_registro?: string;
  }>;
}

export type OdontogramaEstado =
  | "sadio"
  | "cariado"
  | "obturado"
  | "ausente"
  | "extraido"
  | "implante"
  | "coroa"
  | "ponte"
  | "tratamento";

export interface AnamnesePergunta {
  id: number;
  ordem: number;
  pergunta: string;
  tipo: "texto" | "sim_nao" | "data";
  ativo?: boolean;
}

export interface AnamnesePerguntasResponse {
  perguntas: AnamnesePergunta[];
}

export interface AnamnesePacienteResponse {
  perguntas: AnamnesePergunta[];
  respostas: Record<number, string | null>;
}

export interface ContaPagar {
  id: number;
  descricao: string;
  valor: number | string;
  vencimento: string;
  pago_em?: string | null;
  status: string;
  observacoes?: string | null;
}

export interface ContasPagarResponse {
  contas: ContaPagar[];
  total: number;
  page: number;
  totalPages: number;
}
