"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import type { DashboardResumo, AniversariantesResponse } from "@/types/api";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Users, Calendar, UserCog, DollarSign, Gift } from "lucide-react";

export default function DashboardPage() {
  const mesAtual = new Date().getMonth() + 1;
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiGet<DashboardResumo>("/dashboard"),
  });
  const { data: aniversariantesData } = useQuery({
    queryKey: ["pacientes", "aniversariantes", mesAtual],
    queryFn: () => apiGet<AniversariantesResponse>(`/pacientes/aniversariantes?mes=${mesAtual}`),
  });

  if (isLoading) {
    return (
      <div>
        <Header title="Dashboard" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-6">
                <div className="h-4 w-24 rounded bg-gray-200" />
                <div className="mt-2 h-8 w-16 rounded bg-gray-200" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <Header title="Dashboard" />
        <Card className="mt-6">
          <CardContent className="py-8 text-center text-gray-600">
            Não foi possível carregar o dashboard. Tente novamente.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { resumo } = data;
  const cards = [
    { label: "Pacientes", value: resumo.total_pacientes, icon: Users, href: "/dashboard/pacientes" },
    { label: "Consultas (ano)", value: resumo.total_consultas, icon: Calendar, href: "/dashboard/consultas" },
    { label: "Odontólogos", value: resumo.total_dentistas, icon: UserCog, href: "/dashboard/dentistas" },
    { label: "Receita (ano)", value: formatCurrency(resumo.total_receita), icon: DollarSign, href: "/dashboard/pagamentos" },
  ];

  return (
    <div>
      <Header title="Dashboard" subtitle="Visão geral da clínica" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, href }) => (
          <Link key={href} href={href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 py-6">
                <div className="rounded-lg bg-primary-100 p-3">
                  <Icon className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{label}</p>
                  <p className="text-xl font-bold text-gray-900">{value}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Consultas por status</h2>
          </CardHeader>
          <CardContent>
            {data.consultas_por_status?.length ? (
              <ul className="space-y-2">
                {data.consultas_por_status.map(({ status, quantidade }) => (
                  <li key={status} className="flex justify-between text-sm">
                    <span className="capitalize text-gray-700">{status.replace(/_/g, " ")}</span>
                    <span className="font-medium">{quantidade}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Nenhum dado no período.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Procedimentos mais utilizados</h2>
          </CardHeader>
          <CardContent>
            {data.top_procedimentos?.length ? (
              <ul className="space-y-2">
                {data.top_procedimentos.slice(0, 5).map(({ nome, quantidade }) => (
                  <li key={nome} className="flex justify-between text-sm">
                    <span className="text-gray-700">{nome}</span>
                    <span className="font-medium">{quantidade}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Nenhum dado no período.</p>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="mt-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary-600" />
              Aniversariantes do mês
            </h2>
            <Link href="/dashboard/pacientes">
              <span className="text-sm font-medium text-primary-600 hover:underline">Ver pacientes</span>
            </Link>
          </CardHeader>
          <CardContent>
            {aniversariantesData?.aniversariantes?.length ? (
              <ul className="space-y-2">
                {aniversariantesData.aniversariantes.slice(0, 10).map((a) => (
                  <li key={a.id} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700">{a.nome}</span>
                    <span className="text-gray-500">
                      {formatBirthday(a.data_nascimento)}
                    </span>
                  </li>
                ))}
                {aniversariantesData.aniversariantes.length > 10 && (
                  <li className="text-sm text-gray-500 pt-1">
                    + {aniversariantesData.aniversariantes.length - 10} mais
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Nenhum aniversariante este mês.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatBirthday(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value ?? 0);
}
