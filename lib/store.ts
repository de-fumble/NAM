"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Role } from "./data/businesses";

export interface CartLine {
  id: string;
  qty: number;
}


export interface User {
  name: string;
  /** Contact number shown to buyers and sellers. */
  phone: string;
  role: Role;
  /** Set for dealers, rental companies and parts dealers. */
  businessId?: string;
  /** Sign-in email (real accounts; demo accounts have none). */
  email?: string;
}

interface AppState {
  saved: string[];
  compare: string[];
  cart: CartLine[];
  recent: string[];
  user: User | null;
  toggleSaved: (id: string) => boolean;
  toggleCompare: (id: string) => "added" | "removed" | "full";
  clearCompare: () => void;
  addToCart: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  pushRecent: (id: string) => void;
  signIn: (u: User) => void;
  signOut: () => void;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      saved: [],
      compare: [],
      cart: [],
      recent: [],
      user: null,
      toggleSaved: (id) => {
        const has = get().saved.includes(id);
        set({ saved: has ? get().saved.filter((x) => x !== id) : [id, ...get().saved] });
        return !has;
      },
      toggleCompare: (id) => {
        const c = get().compare;
        if (c.includes(id)) {
          set({ compare: c.filter((x) => x !== id) });
          return "removed";
        }
        if (c.length >= 3) return "full";
        set({ compare: [...c, id] });
        return "added";
      },
      clearCompare: () => set({ compare: [] }),
      addToCart: (id, qty = 1) => {
        const cart = get().cart;
        const line = cart.find((l) => l.id === id);
        set({
          cart: line ? cart.map((l) => (l.id === id ? { ...l, qty: Math.min(l.qty + qty, 20) } : l)) : [...cart, { id, qty }],
        });
      },
      setQty: (id, qty) => set({ cart: get().cart.map((l) => (l.id === id ? { ...l, qty: Math.max(1, Math.min(qty, 20)) } : l)) }),
      removeFromCart: (id) => set({ cart: get().cart.filter((l) => l.id !== id) }),
      clearCart: () => set({ cart: [] }),
      pushRecent: (id) => set({ recent: [id, ...get().recent.filter((x) => x !== id)].slice(0, 8) }),
      signIn: (user) => set({ user }),
      signOut: () => set({ user: null }),
    }),
    {
      name: "nam-store",
      version: 1,
      migrate: (state) => {
        const s = state as { user?: User | null };
        if (s?.user && !s.user.role) s.user = { ...s.user, role: "customer" };
        return s as AppState;
      },
      storage: createJSONStorage(() => (typeof window === "undefined" ? undefined : window.localStorage) as Storage),
      skipHydration: true,
    },
  ),
);

/* ---------- Ephemeral UI state (not persisted) ---------- */

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone?: "default" | "success" | "error";
}

interface UIState {
  toasts: Toast[];
  paletteOpen: boolean;
  authOpen: boolean;
  /** Preselected account type when the sign-in sheet opens (e.g. from "Sell on Naija Auto"). */
  authRole: Role | null;
  hydrated: boolean;
  toast: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
  setPalette: (v: boolean) => void;
  setAuth: (v: boolean, role?: Role | null) => void;
  setHydrated: () => void;
}

let tid = 0;
export const useUI = create<UIState>()((set, get) => ({
  toasts: [],
  paletteOpen: false,
  authOpen: false,
  authRole: null,
  hydrated: false,
  toast: (t) => {
    const id = ++tid;
    set({ toasts: [...get().toasts.slice(-2), { ...t, id }] });
    setTimeout(() => get().dismiss(id), 3200);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  setPalette: (paletteOpen) => set({ paletteOpen }),
  setAuth: (authOpen, role = null) => set({ authOpen, authRole: role }),
  setHydrated: () => set({ hydrated: true }),
}));

export const toast = (t: Omit<Toast, "id">) => useUI.getState().toast(t);

/**
 * Guests can browse everything but can't act. Run `fn` with the signed-in user, or open sign-in first.
 */
export function withUser(fn: (u: User) => void) {
  const u = useApp.getState().user;
  if (u) return fn(u);
  useUI.getState().setAuth(true);
  toast({ title: "Sign in to continue", body: "Browsing is free. Buying, selling and messaging need an account." });
}

/** For links and buttons that act directly (call, WhatsApp): stops them and opens sign-in for guests. Returns true if blocked. */
export function blockGuest(e?: { preventDefault(): void; stopPropagation?(): void }) {
  if (useApp.getState().user) return false;
  e?.preventDefault();
  e?.stopPropagation?.();
  withUser(() => {});
  return true;
}

const noSubscribe = () => () => {};
/**
 * True once the persisted stores have loaded AND this render isn't the hydration pass.
 * During hydration it stays false, so pages render the same skeleton the server sent.
 */
export function useReady() {
  const loaded = useUI((s) => s.hydrated);
  const client = useSyncExternalStore(noSubscribe, () => true, () => false);
  return loaded && client;
}
