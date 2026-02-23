"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Paciente } from "@/types/api";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { AnamneseForm } from "@/components/anamnese/AnamneseForm";
import { Pencil, FileText } from "lucide-react";
import { ToothIcon } from "@/components/icons/ToothIcon";

export default function PacienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: paciente, isLoading, error } = useQuery({
    queryKey: ["paciente", id],
    queryFn: () => apiGet<Paciente>(`/pacientes/${id}`),
  });

  if (isLoading) {
    return (
      <div>
        <Header title="Paciente" />
        <Card className="mt-6">
          <CardContent className="py-12 text-center text-gray-500">Carregando...</CardContent>
        </Card>
      </div>
    );
  }

  if (error || !paciente) {
    return (
      <div>
        <Header title="Paciente" />
        <Card className="mt-6">
          <CardContent className="py-12 text-center text-gray-600">
            Paciente não encontrado.
            <Link href="/dashboard/pacientes" className="ml-2 text-primary-600 hover:underline">
              Voltar à lista
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Header
        title={paciente.nome}
        subtitle={`CPF ${formatCpf(paciente.cpf)}`}
        action={
          <div className="flex gap-2">
            <Link href={`/dashboard/pacientes/${paciente.id}/odontograma`}>
              <Button>
                <ToothIcon className="mr-2 h-4 w-4" />
                História clínica / Odontograma
              </Button>
            </Link>
            <Link href={`/dashboard/pacientes/${id}/editar`}>
              <Button variant="outline">
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
            </Link>
          </div>
        }
      />
      {/* Acesso rápido à história clínica */}
      <Link href={`/dashboard/pacientes/${paciente.id}/odontograma`}>
        <Card className="mt-6 border-primary-200 bg-primary-50/50 transition-shadow hover:shadow-md">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
              <FileText className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-gray-900">História clínica</h2>
              <p className="text-sm text-gray-600">
                Odontograma digital interativo — registrar estado dos dentes (ISO 3950), evolução e anotações.
              </p>
            </div>
            <ToothIcon className="h-5 w-5 shrink-0 text-primary-600" />
          </CardContent>
        </Card>
      </Link>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Dados pessoais</h2>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Nome" value={paciente.nome} />
            <Row label="CPF" value={formatCpf(paciente.cpf)} />
            <Row label="Data de nascimento" value={paciente.data_nascimento ? formatDate(paciente.data_nascimento) : "—"} />
            <Row label="Telefone" value={paciente.telefone ?? "—"} />
            <Row label="Email" value={paciente.email ?? "—"} />
            <Row label="Endereço" value={paciente.endereco ?? "—"} />
            <Row label="Status" value={paciente.ativo !== false ? "Ativo" : "Inativo"} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Responsável</h2>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Nome" value={paciente.responsavel_nome ?? "—"} />
            <Row label="CPF" value={paciente.responsavel_cpf ?? "—"} />
            <Row label="Telefone" value={paciente.responsavel_telefone ?? "—"} />
          </CardContent>
        </Card>
      </div>
      <AnamneseForm pacienteId={paciente.id} />
      {paciente.observacoes && (
        <Card className="mt-6">
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Observações</h2>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 whitespace-pre-wrap">
            {paciente.observacoes}
          </CardContent>
        </Card>
      )}
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

function formatCpf(cpf: string): string {
  const n = String(cpf).replace(/\D/g, "");
  if (n.length !== 11) return cpf;
  return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("pt-BR");
}
