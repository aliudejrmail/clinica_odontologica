"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";
import type { Paciente } from "@/types/api";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { PacienteForm, type PacienteFormData } from "@/components/forms/PacienteForm";
import { ArrowLeft } from "lucide-react";

export default function NovoPacientePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

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
      };
      if (data.cpf && data.cpf.replace(/\D/g, "").length === 11) {
        payload.cpf = data.cpf.replace(/\D/g, "");
      }
      const created = await apiPost<Paciente>("/pacientes", payload);
      await queryClient.invalidateQueries({ queryKey: ["pacientes"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      router.push(`/dashboard/pacientes/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar paciente");
    }
  };

  return (
    <div>
      <Header
        title="Novo paciente"
        subtitle="Cadastre um novo paciente"
        action={
          <Link href="/dashboard/pacientes">
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
          <PacienteForm onSubmit={handleSubmit} />
        </CardContent>
      </Card>
    </div>
  );
}
