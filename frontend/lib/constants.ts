export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333";

export const ROLES = {
  clinica_admin: "Administrador",
  dentista: "Odontólogo",
  recepcionista: "Recepcionista",
} as const;

export const CONSULTA_STATUS = [
  "agendada",
  "confirmada",
  "em_andamento",
  "concluida",
  "cancelada",
] as const;

export const ODONTOGRAM_ESTADOS = [
  { value: "sadio", label: "Sadio", color: "bg-green-100 border-green-500" },
  { value: "cariado", label: "Cariado", color: "bg-amber-100 border-amber-600" },
  { value: "obturado", label: "Obturado", color: "bg-blue-100 border-blue-500" },
  { value: "ausente", label: "Ausente", color: "bg-gray-200 border-gray-400" },
  { value: "extraido", label: "Extraído", color: "bg-red-100 border-red-500" },
  { value: "implante", label: "Implante", color: "bg-purple-100 border-purple-500" },
  { value: "coroa", label: "Coroa", color: "bg-cyan-100 border-cyan-500" },
  { value: "ponte", label: "Ponte", color: "bg-indigo-100 border-indigo-500" },
  { value: "tratamento", label: "Em tratamento", color: "bg-yellow-100 border-yellow-600" },
] as const;

export const DENTE_NUMEROS = [
  "18", "17", "16", "15", "14", "13", "12", "11",
  "21", "22", "23", "24", "25", "26", "27", "28",
  "38", "37", "36", "35", "34", "33", "32", "31",
  "41", "42", "43", "44", "45", "46", "47", "48",
];
