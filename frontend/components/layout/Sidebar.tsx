"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Users,
  UserCog,
  Calendar,
  FileText,
  CreditCard,
  BarChart3,
  LogOut,
  Receipt,
  ClipboardList,
} from "lucide-react";
import { ToothIcon } from "@/components/icons/ToothIcon";
import { ROLES } from "@/lib/constants";
import { useAuthStore } from "@/stores/authStore";

const baseNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/pacientes", label: "Pacientes", icon: Users },
  { href: "/dashboard/dentistas", label: "Odontólogos", icon: UserCog },
  { href: "/dashboard/consultas", label: "Consultas", icon: Calendar },
  { href: "/dashboard/procedimentos", label: "Procedimentos", icon: FileText },
  { href: "/dashboard/pagamentos", label: "Pagamentos", icon: CreditCard },
];
const adminNav = [
  { href: "/dashboard/contas-pagar", label: "Contas a pagar", icon: Receipt },
  { href: "/dashboard/configuracoes/anamnese", label: "Perguntas de anamnese", icon: ClipboardList },
  { href: "/dashboard/relatorios", label: "Relatórios", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = user?.role === "clinica_admin";

  const items = isAdmin ? [...baseNav, ...adminNav] : baseNav;

  return (
    <aside className="flex h-full w-[var(--sidebar-width)] flex-col border-r border-gray-200/80 bg-white shadow-sidebar">
      {/* Logo / Brand */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-100 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white shadow-sm">
          <ToothIcon className="h-5 w-5" />
        </div>
        <Link href="/dashboard" className="font-semibold tracking-tight text-gray-900">
          Odonto Clínica
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 scrollbar-thin">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Menu
        </p>
        {items.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary-50 text-primary-700 shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <span
                className={clsx(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                  isActive ? "bg-primary-100 text-primary-600" : "bg-gray-100 text-gray-500"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="shrink-0 border-t border-gray-100 p-3">
        <div className="rounded-lg bg-gray-50 px-3 py-2.5">
          <p className="truncate text-xs font-medium text-gray-900" title={user?.email}>
            {user?.email}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-500">
            {user?.role ? ROLES[user.role as keyof typeof ROLES] ?? user.role : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  );
}
