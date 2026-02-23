"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet, getAuthHeaders } from "@/lib/api";
import { API_URL } from "@/lib/constants";
import type { PagamentosResponse } from "@/types/api";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { format } from "date-fns";
import { FileDown } from "lucide-react";

function downloadRecibo(pagamentoId: number) {
  const url = `${API_URL}/pagamentos/${pagamentoId}/recibo`;
  fetch(url, { headers: getAuthHeaders() })
    .then((r) => {
      if (r.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
        return;
      }
      return r.blob();
    })
    .then((blob) => {
      if (!blob) return;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `recibo-${pagamentoId}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    });
}

export default function PagamentosPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["pagamentos", page],
    queryFn: () => apiGet<PagamentosResponse>(`/pagamentos?page=${page}&limit=20`),
  });

  return (
    <div>
      <Header title="Pagamentos" subtitle="Contas a receber e histórico" />
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
                      <th className="pb-3 font-medium">Data</th>
                      <th className="pb-3 font-medium">Consulta</th>
                      <th className="pb-3 font-medium">Forma</th>
                      <th className="pb-3 font-medium">Valor</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data as { pagamentos?: Array<Pagamento & { consulta?: { paciente?: { nome?: string } } }> })?.pagamentos?.map((p) => (
                      <tr key={p.id} className="border-b border-gray-100">
                        <td className="py-3 text-gray-900">
                          {p.data_pagamento ? format(new Date(p.data_pagamento), "dd/MM/yyyy") : "—"}
                        </td>
                        <td className="py-3 text-gray-600">
                          {(p as { consulta?: { paciente?: { nome?: string } } }).consulta?.paciente?.nome ?? `#${(p as { consulta_id?: number }).consulta_id}`}
                        </td>
                        <td className="py-3 text-gray-600 capitalize">{(p.forma_pagamento ?? "").replace(/_/g, " ")}</td>
                        <td className="py-3 font-medium">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(p.valor))}
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              (p as { status?: string }).status === "pago"
                                ? "bg-green-100 text-green-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {(p as { status?: string }).status ?? "pendente"}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadRecibo(p.id)}
                            title="Baixar recibo PDF"
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data && (data as { totalPages?: number }).totalPages > 1 && (
                <div className="mt-4 flex justify-between border-t border-gray-100 pt-4">
                  <p className="text-sm text-gray-600">Página {data.page} de {(data as { totalPages: number }).totalPages}</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Pagamento {
  id: number;
  valor: number | string;
  forma_pagamento: string;
  data_pagamento: string;
}
