"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Paciente } from "@/types/api";
import type { OdontogramaPaciente } from "@/types/api";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { OdontogramaGrid } from "@/components/odontograma/OdontogramaGrid";
import { ArrowLeft } from "lucide-react";

export default function OdontogramaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: paciente, isLoading: loadingPaciente } = useQuery({
    queryKey: ["paciente", id],
    queryFn: () => apiGet<Paciente>(`/pacientes/${id}`),
  });
  const { data: odontograma, isLoading: loadingOdonto } = useQuery({
    queryKey: ["odontograma", id],
    queryFn: () => apiGet<OdontogramaPaciente>(`/odontogramas/paciente/${id}`),
  });

  const isLoading = loadingPaciente || loadingOdonto;

  if (isLoading || !paciente) {
    return (
      <div>
        <Header title="Odontograma" />
        <Card className="mt-6">
          <CardContent className="py-12 text-center text-gray-500">Carregando...</CardContent>
        </Card>
      </div>
    );
  }

  const dentesMap = new Map<string, { estado: string; faces?: Record<string, string>; observacoes?: string; data_registro?: string }>();
  odontograma?.dentes?.forEach((d) => dentesMap.set(d.dente_num, d));

  function formatCpf(cpf: string): string {
    const n = String(cpf).replace(/\D/g, "");
    if (n.length !== 11) return cpf;
    return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  return (
    <div>
      <Header
        title={`História clínica — ${paciente.nome}`}
        subtitle={`Odontograma digital · CPF ${formatCpf(paciente.cpf)}`}
        action={
          <Link href={`/dashboard/pacientes/${id}`}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar à ficha do paciente
            </Button>
          </Link>
        }
      />
      <Card className="mt-6">
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Odontograma digital (ISO 3950)</h2>
          <p className="text-sm text-gray-600">Clique em um dente para registrar ou alterar o estado (sadio, cariado, obturado, etc.).</p>
        </CardHeader>
        <CardContent>
          <OdontogramaGrid pacienteId={parseInt(id, 10)} dentesMap={dentesMap} />
        </CardContent>
      </Card>
    </div>
  );
}
