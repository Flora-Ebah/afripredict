"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X, Sparkles } from "lucide-react";
import { apiPost } from "../lib/api";
import { useAuthStore } from "../lib/auth-store";
import { useUiStore } from "../lib/ui-store";

const COUNTRIES: [string, string][] = [
  ["CI", "Côte d'Ivoire"], ["SN", "Sénégal"], ["NG", "Nigeria"], ["GH", "Ghana"],
  ["KE", "Kenya"], ["ZA", "South Africa"], ["CM", "Cameroun"], ["MA", "Maroc"],
  ["EG", "Égypte"], ["TZ", "Tanzanie"], ["UG", "Ouganda"], ["RW", "Rwanda"],
  ["BJ", "Bénin"], ["TG", "Togo"], ["GN", "Guinée"],
];

export function AuthModal() {
  const qc = useQueryClient();
  const { authModal, closeAuth, openAuth } = useUiStore();
  const setSession = useAuthStore((s) => s.setSession);

  const [login, setLogin] = useState({ email: "", password: "" });
  const [reg, setReg] = useState({ email: "", username: "", password: "", country: "CI" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError("");
  }, [authModal]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeAuth();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeAuth]);

  if (!authModal) return null;
  const isLogin = authModal === "login";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = isLogin
        ? await apiPost("/auth/login", login)
        : await apiPost("/auth/register", reg);
      setSession(data.user, data.accessToken, data.refreshToken);
      qc.invalidateQueries();
      closeAuth();
    } catch (err: any) {
      setError(err.message ?? "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={closeAuth}
    >
      <div
        className="bg-[color:var(--surface)] rounded-lg w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <button className="btn-ghost p-1.5 absolute right-0 top-0" onClick={closeAuth} aria-label="Fermer">
            <X size={18} />
          </button>
          <div className="flex flex-col items-center text-center gap-2 pt-1">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icon.png" alt="AfriPredict" className="w-8 h-8 object-contain" />
              <span className="font-extrabold text-lg tracking-tight text-[color:var(--gris-900)]">
                Afri<span className="text-terra-600">Predict</span>
              </span>
            </div>
            <h2 className="text-xl font-extrabold">
              {isLogin ? "Bienvenue !" : "Créer un compte"}
            </h2>
            <p className="text-xs text-muted font-medium -mt-1 flex items-center gap-1">
              {isLogin ? (
                "Connectez-vous pour commencer à trader."
              ) : (
                <>
                  <Sparkles size={13} className="text-terra-500" />
                  Rejoignez la communauté — 10 000 AFR virtuels offerts.
                </>
              )}
            </p>
          </div>
        </div>

        {/* tabs */}
        <div className="grid grid-cols-2 gap-1 bg-[color:var(--gris-100)] rounded p-1">
          <button
            className={`rounded py-1.5 text-sm font-semibold transition-colors ${isLogin ? "bg-[color:var(--surface)] text-primary shadow-sm" : "text-muted"}`}
            onClick={() => openAuth("login")}
          >
            Connexion
          </button>
          <button
            className={`rounded py-1.5 text-sm font-semibold transition-colors ${!isLogin ? "bg-[color:var(--surface)] text-primary shadow-sm" : "text-muted"}`}
            onClick={() => openAuth("register")}
          >
            Inscription
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-muted">Email</label>
            <input
              className="input mt-1"
              type="email"
              required
              value={isLogin ? login.email : reg.email}
              onChange={(e) =>
                isLogin ? setLogin({ ...login, email: e.target.value }) : setReg({ ...reg, email: e.target.value })
              }
            />
          </div>
          {!isLogin && (
            <>
              <div>
                <label className="text-xs font-bold text-muted">Nom d&apos;utilisateur</label>
                <input
                  className="input mt-1"
                  required minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]+"
                  value={reg.username}
                  onChange={(e) => setReg({ ...reg, username: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted">Pays</label>
                <select
                  className="input mt-1"
                  value={reg.country}
                  onChange={(e) => setReg({ ...reg, country: e.target.value })}
                >
                  {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                </select>
              </div>
            </>
          )}
          <div>
            <label className="text-xs font-bold text-muted">
              Mot de passe {!isLogin && "(8+ caractères)"}
            </label>
            <input
              className="input mt-1"
              type="password"
              required
              minLength={isLogin ? 1 : 8}
              value={isLogin ? login.password : reg.password}
              onChange={(e) =>
                isLogin ? setLogin({ ...login, password: e.target.value }) : setReg({ ...reg, password: e.target.value })
              }
            />
          </div>

          {error && <p className="text-xs font-semibold text-danger">{error}</p>}

          <button className="btn-primary w-full py-2.5" disabled={loading}>
            {loading ? "…" : isLogin ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        {isLogin && (
          <p className="text-[11px] text-muted font-medium border-t border-[color:var(--gris-200)] pt-3">
            Comptes démo : <code>trader1@demo.africa</code> · <code>admin@demo.africa</code> — mdp <code>Demo1234!</code>
          </p>
        )}
      </div>
    </div>
  );
}
