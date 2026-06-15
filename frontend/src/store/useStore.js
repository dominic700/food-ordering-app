import { create } from 'zustand';

const useStore = create((set, get) => ({
  // ── Auth / role ────────────────────────────────────────────
  // role: 'customer' | 'cafe_owner' | 'admin' | null
  role: null,
  account: null,
  setAuth: (role, account) => set({ role, account }),
  logout: () => set({ role: null, account: null }),

  // ── Customer: current cafe context ────────────────────────
  currentCafe: null,        // { id, name, address, service_fee, ... }
  cafeAccount: null,        // per_cafe_account row (balance, credit, status)
  setCurrentCafe: (cafe) => set({ currentCafe: cafe }),
  setCafeAccount: (acc) => set({ cafeAccount: acc }),

  // ── Cart (per current cafe) ────────────────────────────────
  // item: { menu_item_id, name, price (wallet/discounted unit price),
  //         list_price (full unit price), quantity }
  cart: [],

  addToCart(item) {
    const cart = get().cart;
    const ex = cart.find(i => i.menu_item_id === item.menu_item_id);
    if (ex) {
      set({ cart: cart.map(i => i.menu_item_id === item.menu_item_id ? { ...i, quantity: i.quantity + 1 } : i) });
    } else {
      set({ cart: [...cart, { ...item, quantity: 1 }] });
    }
  },

  removeFromCart(id) {
    const cart = get().cart;
    const ex = cart.find(i => i.menu_item_id === id);
    if (!ex) return;
    if (ex.quantity === 1) set({ cart: cart.filter(i => i.menu_item_id !== id) });
    else set({ cart: cart.map(i => i.menu_item_id === id ? { ...i, quantity: i.quantity - 1 } : i) });
  },

  removeItemFully(id) { set({ cart: get().cart.filter(i => i.menu_item_id !== id) }); },
  clearCart: () => set({ cart: [] }),

  cartCount: () => get().cart.reduce((s, i) => s + i.quantity, 0),

  // Wallet/credit total (after per-item discounts)
  cartTotal: () => get().cart.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0),

  // List total (before discounts) — what 'transfer' orders pay
  cartListTotal: () => get().cart.reduce((s, i) => s + parseFloat(i.list_price ?? i.price) * i.quantity, 0),

  // Total discount across the cart (wallet/credit only)
  cartDiscountTotal() {
    return get().cart.reduce((s, i) => {
      const list = parseFloat(i.list_price ?? i.price);
      const price = parseFloat(i.price);
      return s + (list - price) * i.quantity;
    }, 0);
  },

  // ── Favorites (client-side only) ──────────────────────────
  favorites: [],
  toggleFavorite(cafeId) {
    const favs = get().favorites;
    set({ favorites: favs.includes(cafeId) ? favs.filter(id => id !== cafeId) : [...favs, cafeId] });
  },
  isFavorite: (cafeId) => get().favorites.includes(cafeId),
}));

export default useStore;
