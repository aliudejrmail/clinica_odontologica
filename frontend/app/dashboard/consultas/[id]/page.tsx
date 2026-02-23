"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Consulta } from "@/types/api";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";

export default function ConsultaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: consulta, isLoading, error } = useQuery({
    queryKey: ["consulta", id],
    queryFn: () => apiGet<Consulta>(`/consultas/${id}`),
  });

  if (isLoading || !consulta) {
    return (
      <div>
        <Header title="Consulta" />
        <Card className="mt-6">
          <CardContent className="py-12 text-center text-gray-500">
            {error ? "Consulta não encontrada." : "Carregando..."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const dataHora =
    consulta.data_hora ||
    (consulta.data_consulta && consulta.hora_inicio
      ? `${consulta.data_consulta}T${consulta.hora_inicio}:00`
      : null);

  return (
    <div>
      <Header
        title={`Consulta #${consulta.id}`}
        action={
          <Link href="/dashboard/consultas">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        }
      />
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Dados da consulta</h2>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Data/Hora" value={dataHora ? format(new Date(dataHora), "dd/MM/yyyy HH:mm") : "—"} />
            <Row label="Status" value={(consulta.status ?? "").replace(/_/g, " ")} />
            <Row label="Tipo" value={consulta.tipo ?? consulta.tipo_consulta ?? "—"} />
            <Row
              label="Valor"
              value={
                consulta.valor_total != null
                  ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(consulta.valor_total))
                  : "—"
              }
            />
            {consulta.observacoes && <Row label="Observações" value={consulta.observacoes} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Paciente e profissional</h2>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Paciente" value={consulta.paciente?.nome ?? "—"} />
            <Row label="CPF" value={consulta.paciente?.cpf ?? "—"} />
            <Row label="Odontólogo" value={consulta.dentista?.nome ?? "—"} />
            <Row label="CRO" value={consulta.dentista?.cro ?? "—"} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
