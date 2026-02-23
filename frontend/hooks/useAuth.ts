"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

export function useAuth(requireAuth = true) {
  const { user, token, hydrated, hydrate, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    if (requireAuth && !token) {
      router.replace("/login");
    }
  }, [hydrated, token, requireAuth, router]);

  return { user, token, isAuthenticated: !!token, logout };
}
