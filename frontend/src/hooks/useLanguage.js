import { useState, useEffect, useCallback } from 'react';
import translations from '../i18n/translations.js';
import useStore from '../store/useStore.js';
import { setLanguage as setCustomerLanguage } from '../api/customer.js';
import { setLanguage as setCafeLanguage } from '../api/cafe.js';

const STORAGE_KEY = 'app_language';

// ── Singleton language store ──────────────────────────────────
// Lives outside React so all components share one language value.
// Components subscribe via useEffect and update when it changes.
let _lang = 'en';
const _listeners = new Set();

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'am' || saved === 'en') _lang = saved;
} catch {}

function applyLang(lang) {
  _lang = lang;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  _listeners.forEach(fn => fn(lang));
}

// Persists the language choice to the backend for the signed-in
// role (customer or cafe owner), so Telegram bot push notifications
// (new order, order approved, deposit verified, etc.) are sent in
// the same language — not just the in-app UI text. Admins don't
// receive bot notifications, so there's nothing to persist there.
// Fire-and-forget: never blocks the in-app toggle even if offline.
function persistLangToServer(lang) {
  const role = useStore.getState().role;
  if (role === 'customer')   setCustomerLanguage(lang).catch(() => {});
  else if (role === 'cafe_owner') setCafeLanguage(lang).catch(() => {});
}

function setGlobalLang(lang) {
  applyLang(lang);
  persistLangToServer(lang);
}

// ── syncLanguageFromAccount ────────────────────────────────────
// Called once on app boot, right after auth/init resolves, with
// whatever language is stored on the account server-side. This
// covers a fresh device/browser with no localStorage yet — the
// server value wins. Does NOT write back to the server (it's just
// copying from it, so no persistLangToServer call here).
export function syncLanguageFromAccount(lang) {
  if ((lang === 'en' || lang === 'am') && lang !== _lang) {
    applyLang(lang);
  }
}

// ── useLanguage ───────────────────────────────────────────────
// Returns { t, lang, toggleLang }
//   t(key)       → translated string, falls back to English
//   lang         → 'en' | 'am'
//   toggleLang() → switches between en and am globally, and
//                  persists the choice server-side for this account
export default function useLanguage() {
  const [lang, setLang] = useState(_lang);

  // Subscribe to global changes — when any component toggles the
  // language, all other components re-render too
  useEffect(() => {
    const handler = (newLang) => setLang(newLang);
    _listeners.add(handler);
    return () => _listeners.delete(handler);
  }, []);

  const t = useCallback((key) => {
    return translations[lang]?.[key]
      ?? translations['en']?.[key]
      ?? key;
  }, [lang]);

  const toggleLang = useCallback(() => {
    setGlobalLang(lang === 'en' ? 'am' : 'en');
  }, [lang]);

  return { t, lang, toggleLang };
}
