"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import type { Consulta } from "@/types/api";
import type { PacientesResponse } from "@/types/api";
import type { DentistasResponse } from "@/types/api";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { ArrowLeft } from "lucide-react";

export default function NovaConsultaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [pacienteId, setPacienteId] = useState("");
  const [dentistaId, setDentistaId] = useState("");
  const [dataConsulta, setDataConsulta] = useState("");
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFim, setHoraFim] = useState("10:00");
  const [tipo, setTipo] = useState("consulta");
  const [observacoes, setObservacoes] = useState("");

  const { data: pacientesData } = useQuery({
    queryKey: ["pacientes-list"],
    queryFn: () => apiGet<PacientesResponse>("/pacientes?limit=500"),
  });
  const { data: dentistasData } = useQuery({
    queryKey: ["dentistas-list"],
    queryFn: () => apiGet<DentistasResponse>("/dentistas?limit=100"),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const dataCons = dataConsulta ? new Date(dataConsulta).toISOString().slice(0, 10) : null;
      await apiPost<Consulta>("/consultas", {
        paciente_id: Number(pacienteId),
        dentista_id: Number(dentistaId),
        data_consulta: dataCons,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        tipo,
        observacoes: observacoes || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["consultas"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      router.push("/dashboard/consultas");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao agendar");
    }
  };

  return (
    <div>
      <Header
        title="Nova consulta"
        action={
          <Link href="/dashboard/consultas">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        }
      />
      <Card className="mt-6">
        <CardContent className="py-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="max-w-md space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Paciente *</label>
              <select
                required
                value={pacienteId}
                onChange={(e) => setPacienteId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">Selecione</option>
                {pacientesData?.pacientes?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Odontólogo *</label>
              <select
                required
                value={dentistaId}
                onChange={(e) => setDentistaId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">Selecione</option>
                {dentistasData?.dentistas?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome} ({d.cro})
                  </option>
                ))}
              </select>
            </div>
            <Input label="Data *" type="date" value={dataConsulta} onChange={(e) => setDataConsulta(e.target.value)} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Hora início" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
              <Input label="Hora fim" type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2">
                <option value="consulta">Consulta</option>
                <option value="retorno">Retorno</option>
                <option value="emergencia">Emergência</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Observações</label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
            <Button type="submit">Agendar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
