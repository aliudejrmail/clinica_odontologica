"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPut } from "@/lib/api";
import type { AnamnesePacienteResponse } from "@/types/api";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ClipboardList } from "lucide-react";

export function AnamneseForm({ pacienteId }: { pacienteId: number }) {
  const queryClient = useQueryClient();
  const [valores, setValores] = useState<Record<number, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["anamnese", "paciente", pacienteId],
    queryFn: () => apiGet<AnamnesePacienteResponse>(`/anamnese/paciente/${pacienteId}`),
  });

  useEffect(() => {
    if (data?.respostas) {
      const next: Record<number, string> = {};
      Object.entries(data.respostas).forEach(([k, v]) => {
        next[Number(k)] = v ?? "";
      });
      setValores(next);
    }
  }, [data?.respostas]);

  const saveMutation = useMutation({
    mutationFn: (respostas: { pergunta_id: number; valor: string | null }[]) =>
      apiPut(`/anamnese/paciente/${pacienteId}`, { respostas }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anamnese", "paciente", pacienteId] });
    },
  });

  const handleChange = (perguntaId: number, value: string) => {
    setValores((prev) => ({ ...prev, [perguntaId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const respostas = (data?.perguntas ?? []).map((p) => ({
      pergunta_id: p.id,
      valor: valores[p.id]?.trim() || null,
    }));
    saveMutation.mutate(respostas);
  };

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardContent className="py-8 text-center text-gray-500">Carregando anamnese...</CardContent>
      </Card>
    );
  }

  const perguntas = data?.perguntas ?? [];
  if (perguntas.length === 0) {
    return (
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary-600" />
          <h2 className="font-semibold text-gray-900">Anamnese</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Nenhuma pergunta de anamnese configurada para a clínica.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary-600" />
          Anamnese
        </h2>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {perguntas.map((p) => (
            <div key={p.id} className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">{p.pergunta}</label>
              {p.tipo === "sim_nao" && (
                <select
                  className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={valores[p.id] ?? ""}
                  onChange={(e) => handleChange(p.id, e.target.value)}
                >
                  <option value="">—</option>
                  <option value="Sim">Sim</option>
                  <option value="Não">Não</option>
                </select>
              )}
              {p.tipo === "data" && (
                <Input
                  type="date"
                  value={valores[p.id] ?? ""}
                  onChange={(e) => handleChange(p.id, e.target.value)}
                  className="max-w-xs"
                />
              )}
              {p.tipo === "texto" && (
                <Input
                  type="text"
                  value={valores[p.id] ?? ""}
                  onChange={(e) => handleChange(p.id, e.target.value)}
                  placeholder="Resposta"
                  className="max-w-xl"
                />
              )}
            </div>
          ))}
        </form>
      </CardContent>
    </Card>
  );
}
