"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";
import type { Procedimento } from "@/types/api";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { ArrowLeft } from "lucide-react";

export default function NovoProcedimentoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [duracaoMinutos, setDuracaoMinutos] = useState("30");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const body: Record<string, unknown> = {
        nome,
        valor: parseFloat(valor) || 0,
        duracao_minutos: parseInt(duracaoMinutos, 10) || 30,
      };
      if (codigo) body.codigo = codigo;
      if (descricao) body.descricao = descricao;
      await apiPost<Procedimento>("/procedimentos", body);
      await queryClient.invalidateQueries({ queryKey: ["procedimentos"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      router.push("/dashboard/procedimentos");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar procedimento");
    }
  };

  return (
    <div>
      <Header
        title="Novo procedimento"
        action={
          <Link href="/dashboard/procedimentos">
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
          <form onSubmit={handleSubmit} className="max-w-md space-y-4">
            <Input label="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            <Input label="Nome *" value={nome} onChange={(e) => setNome(e.target.value)} required />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Descrição</label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                rows={3}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>
            <Input label="Valor (R$) *" type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required />
            <Input label="Duração (min)" type="number" value={duracaoMinutos} onChange={(e) => setDuracaoMinutos(e.target.value)} />
            <Button type="submit">Salvar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
