"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiPost } from "../../../lib/api";
import { useAuthStore } from "../../../lib/auth-store";
import { CATEGORY_LABELS } from "../../../lib/format";

const COUNTRIES = ["", "CI", "SN", "NG", "GH", "KE", "ZA", "CM", "MA", "EG", "TZ", "UG", "RW", "BJ", "TG", "GN", "AF"];
const REGIONS = ["", "WEST_AFRICA", "EAST_AFRICA", "CENTRAL_AFRICA", "NORTH_AFRICA", "SOUTHERN_AFRICA", "PAN_AFRICA"];

export default function NewMarketPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState({
    eventTitle: "",
    question: "",
    description: "",
    category: "SPORT",
    country: "",
    region: "",
    closeAt: "",
    resolutionAt: "",
    resolutionCriteria: "",
    resolutionSource: "",
    fallbackSource: "",
  });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiPost("/admin/markets", {
        ...form,
        country: form.country || undefined,
        region: form.region || undefined,
        description: form.description || undefined,
        fallbackSource: form.fallbackSource || undefined,
        closeAt: new Date(form.closeAt).toISOString(),
        resolutionAt: new Date(form.resolutionAt).toISOString(),
      }),
    onSuccess: () => router.push("/admin"),
    onError: (err: any) => setError(err.message),
  });

  if (!user || !["ADMIN", "SUPER_ADMIN", "MARKET_CREATOR"].includes(user.role)) {
    return <div className="card p-10 text-center text-sm text-muted">Accès réservé.</div>;
  }

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const valid =
    form.eventTitle && form.question.includes("?") && form.closeAt && form.resolutionAt &&
    form.resolutionCriteria.length >= 20 && form.resolutionSource;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Créer un marché</h1>
      <div className="card p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted">Titre de l&apos;évènement *</label>
          <input className="input mt-1" value={form.eventTitle} onChange={(e) => set("eventTitle", e.target.value)}
            placeholder="CAN 2027" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted">Question du marché * (doit finir par « ? » et être non ambiguë)</label>
          <input className="input mt-1" value={form.question} onChange={(e) => set("question", e.target.value)}
            placeholder="La Côte d'Ivoire remportera-t-elle la CAN 2027 ?" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted">Description</label>
          <textarea className="input mt-1" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted">Catégorie *</label>
            <select className="input mt-1" value={form.category} onChange={(e) => set("category", e.target.value)}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted">Pays</label>
            <select className="input mt-1" value={form.country} onChange={(e) => set("country", e.target.value)}>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c || "—"}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted">Région</label>
            <select className="input mt-1" value={form.region} onChange={(e) => set("region", e.target.value)}>
              {REGIONS.map((r) => <option key={r} value={r}>{r || "—"}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted">Date de clôture du trading *</label>
            <input className="input mt-1" type="datetime-local" value={form.closeAt} onChange={(e) => set("closeAt", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted">Date de résolution *</label>
            <input className="input mt-1" type="datetime-local" value={form.resolutionAt} onChange={(e) => set("resolutionAt", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted">
            Critères de résolution * (règles YES/NO explicites, vérifiables — min. 20 caractères)
          </label>
          <textarea className="input mt-1" rows={4} value={form.resolutionCriteria}
            onChange={(e) => set("resolutionCriteria", e.target.value)}
            placeholder={"YES si …\nNO dans tous les autres cas."} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted">Source principale *</label>
            <input className="input mt-1" value={form.resolutionSource} onChange={(e) => set("resolutionSource", e.target.value)}
              placeholder="CAF" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted">Source de repli</label>
            <input className="input mt-1" value={form.fallbackSource} onChange={(e) => set("fallbackSource", e.target.value)}
              placeholder="FIFA" />
          </div>
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}
        {!valid && form.question && !form.question.includes("?") && (
          <p className="text-xs text-amber-600">La question doit se terminer par « ? ».</p>
        )}

        <div className="flex justify-end gap-2">
          <button className="btn-outline text-xs" onClick={() => router.push("/admin")}>Annuler</button>
          <button className="btn-primary text-xs" disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Création…" : "Créer le marché"}
          </button>
        </div>
      </div>
    </div>
  );
}
