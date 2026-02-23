"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { ConsultasResponse, Consulta } from "@/types/api";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import ptBR from "date-fns/locale/pt-BR";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function CalendarioConsultas() {
  const [mesAtual, setMesAtual] = useState(() => new Date());

  const inicio = startOfMonth(mesAtual);
  const fim = endOfMonth(mesAtual);
  const dataInicio = format(inicio, "yyyy-MM-dd");
  const dataFim = format(fim, "yyyy-MM-dd");

  const { data, isLoading } = useQuery({
    queryKey: ["consultas", "calendario", dataInicio, dataFim],
    queryFn: () =>
      apiGet<ConsultasResponse>(
        `/consultas?data_inicio=${dataInicio}&data_fim=${dataFim}&limit=200`
      ),
  });

  const eventosPorDia = useMemo(() => {
    const map = new Map<string, Consulta[]>();
    if (!data?.consultas) return map;
    for (const c of data.consultas) {
      const dt = c.data_hora
        ? new Date(c.data_hora)
        : c.data_consulta && c.hora_inicio
        ? new Date(c.data_consulta + "T" + c.hora_inicio + ":00")
        : null;
      if (!dt) continue;
      const key = format(dt, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    map.forEach((arr) => arr.sort(compareConsulta));
    return map;
  }, [data?.consultas]);

  const semanas = useMemo(() => {
    const start = startOfWeek(startOfMonth(mesAtual), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(mesAtual), { weekStartsOn: 0 });
    const dias: Date[] = [];
    let d = start;
    while (d <= end) {
      dias.push(d);
      d = addDays(d, 1);
    }
    const result: Date[][] = [];
    for (let i = 0; i < dias.length; i += 7) result.push(dias.slice(i, i + 7));
    return result;
  }, [mesAtual]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <button
          type="button"
          onClick={() => setMesAtual((m) => subMonths(m, 1))}
          className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="font-semibold text-gray-900 capitalize">
          {format(mesAtual, "MMMM yyyy", { locale: ptBR })}
        </h3>
        <button
          type="button"
          onClick={() => setMesAtual((m) => addMonths(m, 1))}
          className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      {isLoading ? (
        <div className="flex min-h-[320px] items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] table-fixed text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-600">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                <th key={d} className="p-2 font-medium">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {semanas.map((semana, i) => (
              <tr key={i} className="border-b border-gray-100">
                {semana.map((dia) => {
                  const key = format(dia, "yyyy-MM-dd");
                  const eventos = eventosPorDia.get(key) ?? [];
                  const foraDoMes = !isSameMonth(dia, mesAtual);
                  return (
                    <td
                      key={key}
                      className="vertical-align-top border-r border-gray-100 p-1 last:border-r-0"
                    >
                      <div
                        className={`min-h-[80px] rounded p-1 ${
                          foraDoMes ? "bg-gray-50 text-gray-400" : ""
                        } ${isToday(dia) ? "bg-primary-50" : ""}`}
                      >
                        <span
                          className={`inline-block rounded px-1 text-xs font-medium ${
                            isToday(dia) ? "bg-primary-200 text-primary-800" : ""
                          }`}
                        >
                          {format(dia, "d")}
                        </span>
                        <ul className="mt-1 space-y-0.5">
                          {eventos.slice(0, 3).map((c) => (
                            <li key={c.id}>
                              <Link
                                href={`/dashboard/consultas/${c.id}`}
                                className="block truncate rounded bg-primary-100 px-1 py-0.5 text-xs text-primary-800 hover:bg-primary-200"
                                title={`${c.paciente?.nome ?? "—"} • ${horaConsulta(c)}`}
                              >
                                {horaConsulta(c)} {c.paciente?.nome ?? "—"}
                              </Link>
                            </li>
                          ))}
                          {eventos.length > 3 && (
                            <li className="text-xs text-gray-500">
                              +{eventos.length - 3} mais
                            </li>
                          )}
                        </ul>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

function horaConsulta(c: Consulta): string {
  if (c.data_hora) return format(new Date(c.data_hora), "HH:mm");
  if (c.hora_inicio) return c.hora_inicio;
  return "";
}

function compareConsulta(a: Consulta, b: Consulta): number {
  const da = a.data_hora ? new Date(a.data_hora).getTime() : 0;
  const db = b.data_hora ? new Date(b.data_hora).getTime() : 0;
  if (da && db) return da - db;
  if (a.hora_inicio && b.hora_inicio) return a.hora_inicio.localeCompare(b.hora_inicio);
  return 0;
}
