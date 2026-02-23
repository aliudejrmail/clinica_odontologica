"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import type { ContasPagarResponse, ContaPagar } from "@/types/api";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import { format } from "date-fns";

export default function ContasPagarPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ContaPagar | null>(null);
  const [form, setForm] = useState({ descricao: "", valor: "", vencimento: "", observacoes: "" });

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (status) params.set("status", status);

  const { data, isLoading } = useQuery({
    queryKey: ["contas-pagar", page, status],
    queryFn: () => apiGet<ContasPagarResponse>(`/contas-pagar?${params}`),
  });

  const createMutation = useMutation({
    mutationFn: (body: { descricao: string; valor: number; vencimento: string; observacoes?: string }) =>
      apiPost("/contas-pagar", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-pagar"] });
      setShowForm(false);
      setForm({ descricao: "", valor: "", vencimento: "", observacoes: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<ContaPagar> }) => apiPut(`/contas-pagar/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-pagar"] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/contas-pagar/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contas-pagar"] }),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const valor = parseFloat(form.valor.replace(",", "."));
    if (!form.descricao || isNaN(valor) || !form.vencimento) return;
    createMutation.mutate({
      descricao: form.descricao,
      valor,
      vencimento: form.vencimento,
      observacoes: form.observacoes || undefined,
    });
  };

  const handleMarkPaid = (conta: ContaPagar) => {
    updateMutation.mutate({
      id: conta.id,
      body: { status: "pago", pago_em: format(new Date(), "yyyy-MM-dd") },
    });
  };

  return (
    <div>
      <Header
        title="Contas a pagar"
        subtitle="Despesas e obrigações da clínica"
        action={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova conta
          </Button>
        }
      />

      {showForm && (
        <Card className="mt-6">
          <CardContent className="py-4">
            <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-4">
              <div className="min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <Input
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder="Ex: Aluguel"
                  required
                />
              </div>
              <div className="w-28">
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                  placeholder="0,00"
                  required
                />
              </div>
              <div className="w-40">
                <label className="block text-sm font-medium text-gray-700 mb-1">Vencimento</label>
                <Input
                  type="date"
                  value={form.vencimento}
                  onChange={(e) => setForm((f) => ({ ...f, vencimento: e.target.value }))}
                  required
                />
              </div>
              <div className="min-w-[180px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <Input
                  value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardContent className="py-4">
          <div className="mb-4 flex flex-wrap gap-2">
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            >
              <option value="">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Carregando...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-600">
                      <th className="pb-3 font-medium">Descrição</th>
                      <th className="pb-3 font-medium">Valor</th>
                      <th className="pb-3 font-medium">Vencimento</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.contas?.map((c) => (
                      <tr key={c.id} className="border-b border-gray-100">
                        <td className="py-3 text-gray-900">{c.descricao}</td>
                        <td className="py-3">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(c.valor))}
                        </td>
                        <td className="py-3">{format(new Date(c.vencimento), "dd/MM/yyyy")}</td>
                        <td className="py-3">
                          <span
                            className={
                              c.status === "pago"
                                ? "text-green-600"
                                : c.status === "cancelado"
                                ? "text-gray-500"
                                : "text-amber-600"
                            }
                          >
                            {c.status === "pago" ? "Pago" : c.status === "cancelado" ? "Cancelado" : "Pendente"}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {c.status === "pendente" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mr-1"
                              onClick={() => handleMarkPaid(c)}
                              disabled={updateMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="mr-1"
                            onClick={() => setEditing(c)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.confirm("Excluir esta conta?") && deleteMutation.mutate(c.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data && data.totalPages > 1 && (
                <div className="mt-4 flex justify-between border-t border-gray-100 pt-4">
                  <p className="text-sm text-gray-600">
                    Página {data.page} de {data.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Anterior
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= data.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {editing && (
        <EditModal
          conta={editing}
          onClose={() => setEditing(null)}
          onSave={(body) => updateMutation.mutate({ id: editing.id, body })}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function EditModal({
  conta,
  onClose,
  onSave,
  isPending,
}: {
  conta: ContaPagar;
  onClose: () => void;
  onSave: (body: Partial<ContaPagar>) => void;
  isPending: boolean;
}) {
  const [descricao, setDescricao] = useState(conta.descricao);
  const [valor, setValor] = useState(String(conta.valor));
  const [vencimento, setVencimento] = useState(conta.vencimento.slice(0, 10));
  const [status, setStatus] = useState(conta.status);
  const [pagoEm, setPagoEm] = useState(conta.pago_em?.slice(0, 10) ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseFloat(valor.replace(",", "."));
    if (isNaN(v)) return;
    onSave({
      descricao,
      valor: v,
      vencimento,
      status,
      pago_em: status === "pago" && pagoEm ? pagoEm : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Editar conta</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
            <Input type="text" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vencimento</label>
            <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          {status === "pago" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data do pagamento</label>
              <Input type="date" value={pagoEm} onChange={(e) => setPagoEm(e.target.value)} />
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
