"use client";

import { create } from "zustand";

interface UiState {
  authModal: "login" | "register" | null;
  searchOpen: boolean;
  openAuth: (mode: "login" | "register") => void;
  closeAuth: () => void;
  openSearch: () => void;
  closeSearch: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  authModal: null,
  searchOpen: false,
  openAuth: (mode) => set({ authModal: mode, searchOpen: false }),
  closeAuth: () => set({ authModal: null }),
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
}));
