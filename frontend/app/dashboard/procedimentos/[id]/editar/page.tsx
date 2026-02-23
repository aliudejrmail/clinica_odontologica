"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPut } from "@/lib/api";
import type { Procedimento } from "@/types/api";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { ArrowLeft } from "lucide-react";

export default function EditarProcedimentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [ativo, setAtivo] = useState(true);

  const { data: proc, isLoading } = useQuery({
    queryKey: ["procedimento", id],
    queryFn: () => apiGet<Procedimento & { valor?: number; duracao_minutos?: number }>(`/procedimentos/${id}`),
  });

  useEffect(() => {
    if (!proc) return;
    const val = (proc as { valor?: number }).valor ?? proc.valor_base;
    setNome(proc.nome);
    setCodigo(proc.codigo ?? "");
    setDescricao(proc.descricao ?? "");
    setValor(String(val ?? 0));
    setAtivo(proc.ativo !== false);
  }, [proc]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiPut(`/procedimentos/${id}`, {
        nome,
        codigo: codigo || undefined,
        descricao: descricao || undefined,
        valor: parseFloat(valor) || 0,
        duracao_minutos: 30,
        ativo,
      });
      await queryClient.invalidateQueries({ queryKey: ["procedimentos"] });
      await queryClient.invalidateQueries({ queryKey: ["procedimento", id] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      window.location.href = "/dashboard/procedimentos";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar");
    }
  };

  if (isLoading || !proc) {
    return (
      <div>
        <Header title="Editar procedimento" />
        <Card className="mt-6">
          <CardContent className="py-12 text-center text-gray-500">Carregando...</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Editar procedimento"
        subtitle={proc.nome}
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
            <div className="flex items-center gap-2">
              <input type="checkbox" id="ativo" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="rounded border-gray-300" />
              <label htmlFor="ativo" className="text-sm text-gray-700">Ativo</label>
            </div>
            <Button type="submit">Salvar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
