"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPut } from "@/lib/api";
import type { Paciente } from "@/types/api";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { PacienteForm, type PacienteFormData } from "@/components/forms/PacienteForm";
import { ArrowLeft } from "lucide-react";

export default function EditarPacientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: paciente, isLoading } = useQuery({
    queryKey: ["paciente", id],
    queryFn: () => apiGet<Paciente>(`/pacientes/${id}`),
  });

  const handleSubmit = async (data: PacienteFormData) => {
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        nome: data.nome,
        data_nascimento: data.data_nascimento || undefined,
        telefone: data.telefone || undefined,
        email: data.email || undefined,
        endereco: data.endereco || undefined,
        observacoes: data.observacoes || undefined,
        ativo: data.ativo,
      };
      if (data.cpf && data.cpf.replace(/\D/g, "").length === 11) {
        payload.cpf = data.cpf.replace(/\D/g, "");
      }
      await apiPut<Paciente>(`/pacientes/${id}`, payload);
      await queryClient.invalidateQueries({ queryKey: ["paciente", id] });
      await queryClient.invalidateQueries({ queryKey: ["pacientes"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      window.location.href = `/dashboard/pacientes/${id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar paciente");
    }
  };

  if (isLoading || !paciente) {
    return (
      <div>
        <Header title="Editar paciente" />
        <Card className="mt-6">
          <CardContent className="py-12 text-center text-gray-500">Carregando...</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Editar paciente"
        subtitle={paciente.nome}
        action={
          <Link href={`/dashboard/pacientes/${id}`}>
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
          <PacienteForm defaultValues={paciente} onSubmit={handleSubmit} />
        </CardContent>
      </Card>
    </div>
  );
}
