"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUiStore } from "../../lib/ui-store";

// L'authentification passe par un modal : cette page ne sert que de fallback d'URL.
export default function RegisterPage() {
  const router = useRouter();
  const openAuth = useUiStore((s) => s.openAuth);

  useEffect(() => {
    router.replace("/");
    openAuth("register");
  }, [router, openAuth]);

  return null;
}
