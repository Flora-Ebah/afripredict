"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogIn } from "lucide-react";
import { apiPost } from "../lib/api";
import { useAuthStore } from "../lib/auth-store";
import { useUiStore } from "../lib/ui-store";

interface Props {
  marketId: string;
  yesPrice: number;
  noPrice: number;
  status: string;
  myShares: { YES: number; NO: number };
}

export function TradePanel({ marketId, yesPrice, noPrice, status, myShares }: Props) {
  const user = useAuthStore((s) => s.user);
  const openAuth = useUiStore((s) => s.openAuth);
  const qc = useQueryClient();
  const [outcome, setOutcome] = useState<"YES" | "NO">("YES");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"LIMIT" | "MARKET">("LIMIT");
  const [price, setPrice] = useState(Math.round(yesPrice * 100));
  const [quantity, setQuantity] = useState(100);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const currentPrice = outcome === "YES" ? yesPrice : noPrice;

  const mutation = useMutation({
    mutationFn: () =>
      apiPost("/orders", {
        marketId,
        outcome,
        side,
        orderType,
        ...(orderType === "LIMIT" ? { priceCents: price } : {}),
        quantity,
        idempotencyKey: `${user?.id}-${marketId}-${Date.now()}`,
      }),
    onSuccess: (order: any) => {
      const filled = order.quantity - order.remainingQuantity;
      setMessage({
        type: "ok",
        text:
          order.status === "FILLED"
            ? `Ordre exécuté : ${filled} parts.`
            : order.status === "PARTIALLY_FILLED"
            ? `Partiellement exécuté : ${filled}/${order.quantity} parts, le reste est dans le book.`
            : order.status === "OPEN"
            ? "Ordre placé dans le book."
            : `Ordre ${order.status}.`,
      });
      qc.invalidateQueries({ queryKey: ["market", marketId] });
      qc.invalidateQueries({ queryKey: ["orderbook", marketId] });
      qc.invalidateQueries({ queryKey: ["trades", marketId] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err: any) => setMessage({ type: "err", text: err.message }),
  });

  if (status !== "OPEN") {
    return (
      <div className="card p-4 text-center text-sm text-muted">
        {status === "RESOLVED" ? "Ce marché est résolu." : "Ce marché est fermé au trading."}
      </div>
    );
  }
  if (!user) {
    return (
      <div className="card p-5 text-center space-y-3">
        <p className="text-sm text-muted font-semibold">Connectez-vous pour trader ce marché.</p>
        <button onClick={() => openAuth("login")} className="btn-primary text-xs w-full py-2">
          <LogIn size={14} /> Connexion
        </button>
      </div>
    );
  }

  const effectivePrice = orderType === "LIMIT" ? price : Math.round(currentPrice * 100);
  const cost = (effectivePrice * quantity) / 100;
  const payout = quantity;
  const profit = payout - cost;
  const sharesOwned = myShares[outcome];

  return (
    <div className="card p-4 space-y-3">
      {/* outcome toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          className={`btn py-2 ${outcome === "YES" ? "bg-success text-white" : "btn-outline"}`}
          onClick={() => { setOutcome("YES"); setPrice(Math.round(yesPrice * 100)); setMessage(null); }}
        >
          YES {Math.round(yesPrice * 100)}¢
        </button>
        <button
          className={`btn py-2 ${outcome === "NO" ? "bg-danger text-white" : "btn-outline"}`}
          onClick={() => { setOutcome("NO"); setPrice(Math.round(noPrice * 100)); setMessage(null); }}
        >
          NO {Math.round(noPrice * 100)}¢
        </button>
      </div>

      {/* side toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button className={`btn text-xs ${side === "BUY" ? "btn-secondary" : "btn-outline"}`} onClick={() => setSide("BUY")}>
          Acheter
        </button>
        <button
          className={`btn text-xs ${side === "SELL" ? "btn-secondary" : "btn-outline"}`}
          onClick={() => setSide("SELL")}
          title={sharesOwned === 0 ? "Vous ne détenez pas de parts sur cette issue" : ""}
        >
          Vendre {sharesOwned > 0 ? `(${sharesOwned})` : ""}
        </button>
      </div>

      {/* order type */}
      <div className="flex gap-4 text-xs">
        {(["MARKET", "LIMIT"] as const).map((t) => (
          <label key={t} className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" checked={orderType === t} onChange={() => setOrderType(t)} />
            {t === "MARKET" ? "Au marché" : "Limite"}
          </label>
        ))}
      </div>

      {orderType === "LIMIT" && (
        <div>
          <label className="text-xs font-semibold text-muted">Prix (¢ par part, 1–99)</label>
          <input
            className="input mt-1" type="number" min={1} max={99} value={price}
            onChange={(e) => setPrice(Math.max(1, Math.min(99, Number(e.target.value))))}
          />
        </div>
      )}
      <div>
        <label className="text-xs font-semibold text-muted">Quantité (parts)</label>
        <input
          className="input mt-1" type="number" min={1} value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
        />
      </div>

      {/* summary */}
      <div className="bg-gray-50 rounded p-3 text-xs space-y-1">
        {side === "BUY" ? (
          <>
            <div className="flex justify-between"><span className="text-muted">Coût estimé</span><b>{cost.toFixed(2)} AFR</b></div>
            <div className="flex justify-between"><span className="text-muted">Paiement si {outcome} gagne</span><b>{payout} AFR</b></div>
            <div className="flex justify-between"><span className="text-muted">Profit potentiel</span><b className="text-success">+{profit.toFixed(2)} AFR</b></div>
          </>
        ) : (
          <div className="flex justify-between"><span className="text-muted">Produit estimé de la vente</span><b>{cost.toFixed(2)} AFR</b></div>
        )}
      </div>

      {message && (
        <p className={`text-xs ${message.type === "ok" ? "text-success" : "text-danger"}`}>{message.text}</p>
      )}

      <button
        className={`w-full py-2.5 ${side === "BUY" ? (outcome === "YES" ? "btn-success" : "btn-danger") : "btn-primary"}`}
        disabled={mutation.isPending || (side === "SELL" && sharesOwned < quantity)}
        onClick={() => { setMessage(null); mutation.mutate(); }}
      >
        {mutation.isPending
          ? "Envoi…"
          : side === "SELL" && sharesOwned < quantity
          ? "Parts insuffisantes"
          : `${side === "BUY" ? "Acheter" : "Vendre"} ${quantity} ${outcome}`}
      </button>
      <p className="text-[10px] text-muted text-center">Crédits virtuels AFR — simulation, aucune valeur réelle.</p>
    </div>
  );
}
