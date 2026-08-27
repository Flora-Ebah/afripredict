"use client";

import { useEffect } from "react";
import { io, Socket } from "socket.io-client";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, { transports: ["websocket"], autoConnect: true });
  }
  return socket;
}

/** Subscribe to one market's realtime room; handler receives (event, payload). */
export function useMarketSocket(
  marketId: string | undefined,
  handler: (event: string, payload: any) => void,
) {
  useEffect(() => {
    if (!marketId) return;
    const s = getSocket();
    s.emit("market.subscribe", { marketId });
    const events = ["orderbook.updated", "trade.created", "market.price.updated", "market.resolved"];
    const listeners = events.map((ev) => {
      const fn = (payload: any) => {
        if (payload?.marketId === marketId) handler(ev, payload);
      };
      s.on(ev, fn);
      return [ev, fn] as const;
    });
    return () => {
      s.emit("market.unsubscribe", { marketId });
      listeners.forEach(([ev, fn]) => s.off(ev, fn));
    };
  }, [marketId, handler]);
}

export function useUserSocket(userId: string | undefined, handler: (payload: any) => void) {
  useEffect(() => {
    if (!userId) return;
    const s = getSocket();
    s.emit("user.subscribe", { userId });
    s.on("notification.created", handler);
    return () => {
      s.off("notification.created", handler);
    };
  }, [userId, handler]);
}
