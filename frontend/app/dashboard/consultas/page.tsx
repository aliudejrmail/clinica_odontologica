"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { ConsultasResponse } from "@/types/api";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { CalendarioConsultas } from "@/components/consultas/CalendarioConsultas";
import { Plus, List, Calendar, Filter, X, Eye, CalendarDays } from "lucide-react";
import { format } from "date-fns";

type ViewMode = "lista" | "calendario";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  agendada: { label: "Agendada", className: "bg-blue-100 text-blue-800" },
  confirmada: { label: "Confirmada", className: "bg-emerald-100 text-emerald-800" },
  em_andamento: { label: "Em andamento", className: "bg-amber-100 text-amber-800" },
  concluida: { label: "Concluída", className: "bg-gray-100 text-gray-700" },
  cancelada: { label: "Cancelada", className: "bg-red-100 text-red-800" },
};

function getStatusBadge(status: string) {
  const config = STATUS_CONFIG[status] ?? { label: status.replace(/_/g, " "), className: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="flex gap-4 border-b border-gray-100 pb-3">
          <div className="h-4 w-28 rounded bg-gray-200" />
          <div className="h-4 flex-1 max-w-[120px] rounded bg-gray-200" />
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-4 w-20 rounded bg-gray-200" />
          <div className="h-4 w-16 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

export default function ConsultasPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("lista");
  const [page, setPage] = useState(1);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["consultas", page, dataInicio, dataFim, status],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (dataInicio) params.set("data_inicio", dataInicio);
      if (dataFim) params.set("data_fim", dataFim);
      if (status) params.set("status", status);
      return apiGet<ConsultasResponse>(`/consultas?${params}`);
    },
    placeholderData: keepPreviousData,
  });

  const temFiltros = dataInicio || dataFim || status;
  const limparFiltros = () => {
    setDataInicio("");
    setDataFim("");
    setStatus("");
    setPage(1);
  };

  const aplicarHoje = () => {
    const hoje = new Date();
    setDataInicio(format(hoje, "yyyy-MM-dd"));
    setDataFim(format(hoje, "yyyy-MM-dd"));
    setPage(1);
  };

  return (
    <div>
      <Header
        title="Consultas"
        subtitle="Agenda e histórico de consultas"
        action={
          <Link href="/dashboard/consultas/nova">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova consulta
            </Button>
          </Link>
        }
      />

      {/* Abas Lista / Calendário */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            onClick={() => setViewMode("lista")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === "lista" ? "bg-white text-primary-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <List className="mr-2 inline-block h-4 w-4" />
            Lista
          </button>
          <button
            type="button"
            onClick={() => setViewMode("calendario")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === "calendario" ? "bg-white text-primary-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Calendar className="mr-2 inline-block h-4 w-4" />
            Calendário
          </button>
        </div>
      </div>

      {viewMode === "calendario" ? (
        <div className="mt-6">
          <CalendarioConsultas />
        </div>
      ) : (
        <>
          {/* Filtros */}
          <Card className="mt-6">
            <CardContent className="py-4">
              <div className="flex flex-wrap gap-x-6 gap-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Filter className="h-4 w-4 shrink-0" />
                  Filtros
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0 items-end">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-500">Data início</label>
                    <Input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => { setDataInicio(e.target.value); setPage(1); }}
                      className="h-10 w-40"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-500">Data fim</label>
                    <Input
                      type="date"
                      value={dataFim}
                      onChange={(e) => { setDataFim(e.target.value); setPage(1); }}
                      className="h-10 w-40"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="block h-4" aria-hidden="true" />
                    <Button type="button" variant="outline" size="sm" onClick={aplicarHoje} className="h-10 px-3">
                      <CalendarDays className="mr-1.5 h-4 w-4" />
                      Hoje
                    </Button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-500">Status</label>
                    <select
                      className="h-10 rounded-lg border border-gray-300 px-3 py-2 text-sm w-44 box-border"
                      value={status}
                      onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                    >
                      <option value="">Todos</option>
                      <option value="agendada">Agendada</option>
                      <option value="confirmada">Confirmada</option>
                      <option value="em_andamento">Em andamento</option>
                      <option value="concluida">Concluída</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                  {temFiltros && (
                    <div className="flex flex-col gap-1.5">
                      <span className="block h-4" aria-hidden="true" />
                      <Button type="button" variant="outline" size="sm" onClick={limparFiltros} className="h-10 px-3">
                        <X className="mr-1.5 h-4 w-4" />
                        Limpar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela */}
          <Card className="mt-4">
            <CardContent className="py-4">
              {isLoading ? (
                <TableSkeleton />
              ) : !data?.consultas?.length ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Calendar className="h-12 w-12 text-gray-300" />
                  <p className="mt-3 font-medium text-gray-700">Nenhuma consulta encontrada</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {temFiltros ? "Tente alterar os filtros ou limpar para ver todas." : "Agende a primeira consulta."}
                  </p>
                  {temFiltros ? (
                    <Button variant="outline" className="mt-4" onClick={limparFiltros}>
                      Limpar filtros
                    </Button>
                  ) : (
                    <Link href="/dashboard/consultas/nova" className="mt-4">
                      <Button>Nova consulta</Button>
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-900">{data.total}</span> consulta(s)
                      {temFiltros && " no período"}
                    </p>
                    {isFetching && !isLoading && (
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-primary-500" />
                        Atualizando...
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-600">
                          <th className="pb-3 font-medium">Data / Hora</th>
                          <th className="pb-3 font-medium">Paciente</th>
                          <th className="pb-3 font-medium">Odontólogo</th>
                          <th className="pb-3 font-medium">Status</th>
                          <th className="pb-3 font-medium">Valor</th>
                          <th className="pb-3 font-medium text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.consultas.map((c) => (
                          <tr key={c.id} className="border-b border-gray-100 transition-colors hover:bg-gray-50/50">
                            <td className="py-3 text-gray-900">
                              {c.data_hora
                                ? format(new Date(c.data_hora), "dd/MM/yyyy HH:mm")
                                : c.data_consulta && c.hora_inicio
                                ? `${format(new Date(c.data_consulta), "dd/MM/yyyy")} ${c.hora_inicio}`
                                : "—"}
                            </td>
                            <td className="py-3 font-medium text-gray-900">{c.paciente?.nome ?? "—"}</td>
                            <td className="py-3 text-gray-600">{c.dentista?.nome ?? "—"}</td>
                            <td className="py-3">{getStatusBadge(c.status ?? "")}</td>
                            <td className="py-3 text-gray-600">
                              {c.valor_total != null
                                ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(c.valor_total))
                                : "—"}
                            </td>
                            <td className="py-3 text-right">
                              <Link
                                href={`/dashboard/consultas/${c.id}`}
                                className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium"
                              >
                                <Eye className="h-4 w-4" />
                                Ver
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {data.totalPages > 1 && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4">
                      <p className="text-sm text-gray-600">
                        Página <span className="font-medium">{data.page}</span> de {data.totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => p - 1)}
                        >
                          Anterior
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={page >= data.totalPages}
                          onClick={() => setPage((p) => p + 1)}
                        >
                          Próxima
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
