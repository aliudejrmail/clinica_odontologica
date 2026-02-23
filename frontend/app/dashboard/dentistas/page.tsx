"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { DentistasResponse } from "@/types/api";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Plus, Pencil } from "lucide-react";

export default function DentistasPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["dentistas", page],
    queryFn: () => apiGet<DentistasResponse>(`/dentistas?page=${page}&limit=20`),
  });

  return (
    <div>
      <Header
        title="Odontólogos"
        subtitle="Profissionais da clínica"
        action={
          <Link href="/dashboard/dentistas/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo odontólogo
            </Button>
          </Link>
        }
      />
      <Card className="mt-6">
        <CardContent className="py-4">
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Carregando...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-600">
                      <th className="pb-3 font-medium">Nome</th>
                      <th className="pb-3 font-medium">CRO</th>
                      <th className="pb-3 font-medium">Especialidade</th>
                      <th className="pb-3 font-medium">Telefone</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.dentistas?.map((d) => (
                      <tr key={d.id} className="border-b border-gray-100">
                        <td className="py-3 font-medium text-gray-900">{d.nome}</td>
                        <td className="py-3 text-gray-600">{d.cro}</td>
                        <td className="py-3 text-gray-600">{d.especialidade ?? "—"}</td>
                        <td className="py-3 text-gray-600">{d.telefone ?? "—"}</td>
                        <td className="py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              d.ativo !== false ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {d.ativo !== false ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <Link
                            href={`/dashboard/dentistas/${d.id}/editar`}
                            className="inline-flex text-gray-600 hover:text-primary-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
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
                    <Button size="sm" variant="outline" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
