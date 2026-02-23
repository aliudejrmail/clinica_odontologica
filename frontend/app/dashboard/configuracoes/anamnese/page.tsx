"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import type { AnamnesePerguntasResponse, AnamnesePergunta } from "@/types/api";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Plus, Pencil, Trash2, ClipboardList } from "lucide-react";

const TIPO_LABELS: Record<string, string> = {
  texto: "Texto livre",
  sim_nao: "Sim ou não",
  data: "Data",
};

export default function ConfiguracaoAnamnesePage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AnamnesePergunta | null>(null);
  const [form, setForm] = useState({ pergunta: "", tipo: "texto" as const, ordem: 0 });
  const [ativo, setAtivo] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["anamnese", "perguntas", "config"],
    queryFn: () => apiGet<AnamnesePerguntasResponse>("/anamnese/perguntas?incluir_inativas=true"),
  });

  const createMutation = useMutation({
    mutationFn: (body: { pergunta: string; tipo: string; ordem?: number }) =>
      apiPost("/anamnese/perguntas", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anamnese"] });
      setModalOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<AnamnesePergunta> }) =>
      apiPut(`/anamnese/perguntas/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anamnese"] });
      setEditing(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/anamnese/perguntas/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["anamnese"] }),
  });

  function resetForm() {
    setForm({ pergunta: "", tipo: "texto", ordem: 0 });
    setEditing(null);
    setModalOpen(false);
  }

  function openNew() {
    const maxOrdem = data?.perguntas?.length ? Math.max(...data.perguntas.map((p) => p.ordem), 0) + 1 : 0;
    setForm({ pergunta: "", tipo: "texto", ordem: maxOrdem });
    setAtivo(true);
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(p: AnamnesePergunta) {
    setForm({ pergunta: p.pergunta, tipo: p.tipo, ordem: p.ordem });
    setAtivo(p.ativo !== false);
    setEditing(p);
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.pergunta.trim()) return;
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        body: { pergunta: form.pergunta.trim(), tipo: form.tipo, ordem: form.ordem, ativo },
      });
    } else {
      createMutation.mutate({
        pergunta: form.pergunta.trim(),
        tipo: form.tipo,
        ordem: form.ordem || undefined,
      });
    }
  }

  const perguntas = data?.perguntas ?? [];
  const ativas = perguntas.filter((p) => p.ativo !== false);
  const inativas = perguntas.filter((p) => p.ativo === false);

  return (
    <div>
      <Header
        title="Perguntas de anamnese"
        subtitle="Personalize as perguntas da ficha de anamnese odontológica. Elas aparecem na ficha do paciente para preenchimento rápido e seguro."
        action={
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nova pergunta
          </Button>
        }
      />

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center gap-2 border-b border-gray-100 pb-4">
          <ClipboardList className="h-5 w-5 text-primary-600" />
          <h2 className="font-semibold text-gray-900">Modelo de anamnese</h2>
        </CardHeader>
        <CardContent className="py-4">
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Carregando...</div>
          ) : perguntas.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 py-12 text-center">
              <p className="text-gray-600">Nenhuma pergunta configurada.</p>
              <p className="mt-1 text-sm text-gray-500">
                As perguntas que você criar aqui aparecerão na ficha de cada paciente.
              </p>
              <Button className="mt-4" onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar primeira pergunta
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-600">
                      <th className="pb-3 font-medium w-16">Ordem</th>
                      <th className="pb-3 font-medium">Pergunta</th>
                      <th className="pb-3 font-medium w-32">Tipo</th>
                      <th className="pb-3 font-medium w-24">Status</th>
                      <th className="pb-3 font-medium text-right w-28">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ativas.map((p) => (
                      <tr key={p.id} className="border-b border-gray-100">
                        <td className="py-3 text-gray-600">{p.ordem}</td>
                        <td className="py-3 text-gray-900">{p.pergunta}</td>
                        <td className="py-3 text-gray-600">{TIPO_LABELS[p.tipo] ?? p.tipo}</td>
                        <td className="py-3">
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Ativa
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <Button size="sm" variant="outline" className="mr-1" onClick={() => openEdit(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              window.confirm("Desativar esta pergunta? Ela deixará de aparecer na ficha do paciente.") &&
                              deleteMutation.mutate(p.id)
                            }
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {inativas.map((p) => (
                      <tr key={p.id} className="border-b border-gray-100 bg-gray-50/50">
                        <td className="py-3 text-gray-400">{p.ordem}</td>
                        <td className="py-3 text-gray-500">{p.pergunta}</td>
                        <td className="py-3 text-gray-400">{TIPO_LABELS[p.tipo] ?? p.tipo}</td>
                        <td className="py-3">
                          <span className="inline-flex rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                            Inativa
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-gray-500">
                O paciente responde às perguntas ativas na sua ficha (História clínica / Anamnese). Desativar uma
                pergunta não apaga as respostas já salvas.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {modalOpen && (
        <ModalPergunta
          form={form}
          setForm={setForm}
          editing={editing}
          ativo={ativo}
          setAtivo={setAtivo}
          onSubmit={handleSubmit}
          onClose={resetForm}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}

function ModalPergunta({
  form,
  setForm,
  editing,
  ativo,
  setAtivo,
  onSubmit,
  onClose,
  isPending,
}: {
  form: { pergunta: string; tipo: "texto" | "sim_nao" | "data"; ordem: number };
  setForm: React.Dispatch<React.SetStateAction<{ pergunta: string; tipo: "texto" | "sim_nao" | "data"; ordem: number }>>;
  editing: AnamnesePergunta | null;
  ativo: boolean;
  setAtivo: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900">
          {editing ? "Editar pergunta" : "Nova pergunta de anamnese"}
        </h3>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Pergunta *</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={3}
              value={form.pergunta}
              onChange={(e) => setForm((f) => ({ ...f, pergunta: e.target.value }))}
              placeholder="Ex.: Possui alergia a algum medicamento?"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tipo de resposta</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={form.tipo}
              onChange={(e) =>
                setForm((f) => ({ ...f, tipo: e.target.value as "texto" | "sim_nao" | "data" }))
              }
            >
              <option value="texto">Texto livre</option>
              <option value="sim_nao">Sim ou não</option>
              <option value="data">Data</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Ordem (exibição)</label>
            <Input
              type="number"
              min={0}
              value={form.ordem}
              onChange={(e) => setForm((f) => ({ ...f, ordem: parseInt(e.target.value, 10) || 0 }))}
            />
          </div>
          {editing && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="ativo" className="text-sm text-gray-700">
                Pergunta ativa (visível na ficha do paciente)
              </label>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isPending || !form.pergunta.trim()}>
              {isPending ? "Salvando..." : editing ? "Salvar" : "Adicionar"}
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
