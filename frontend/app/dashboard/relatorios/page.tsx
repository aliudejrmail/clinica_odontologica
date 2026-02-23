"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { DashboardResumo } from "@/types/api";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const CORES = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function RelatoriosPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiGet<DashboardResumo>("/dashboard"),
  });

  if (isLoading) {
    return (
      <div>
        <Header title="Relatórios" />
        <Card className="mt-6">
          <CardContent className="py-12 text-center text-gray-500">Carregando...</CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <Header title="Relatórios" />
        <Card className="mt-6">
          <CardContent className="py-12 text-center text-gray-600">Não foi possível carregar os dados.</CardContent>
        </Card>
      </div>
    );
  }

  const porMes = (data.consultas_por_mes ?? []).map(({ mes, quantidade }) => ({
    mes: mes.slice(0, 7),
    consultas: quantidade,
  }));
  const porStatus = (data.consultas_por_status ?? []).map(({ status, quantidade }) => ({
    name: status.replace(/_/g, " "),
    value: quantidade,
  }));

  return (
    <div>
      <Header title="Relatórios" subtitle="Visão analítica da clínica" />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Consultas por mês</h2>
          </CardHeader>
          <CardContent>
            {porMes.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porMes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="consultas" fill="#0ea5e9" name="Consultas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nenhum dado no período.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Consultas por status</h2>
          </CardHeader>
          <CardContent>
            {porStatus.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={porStatus}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {porStatus.map((_, i) => (
                        <Cell key={i} fill={CORES[i % CORES.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nenhum dado no período.</p>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Procedimentos mais utilizados</h2>
        </CardHeader>
        <CardContent>
          {data.top_procedimentos?.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.top_procedimentos.slice(0, 10)}
                  layout="vertical"
                  margin={{ left: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="nome" width={90} />
                  <Tooltip />
                  <Bar dataKey="quantidade" fill="#10b981" name="Quantidade" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nenhum dado no período.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
