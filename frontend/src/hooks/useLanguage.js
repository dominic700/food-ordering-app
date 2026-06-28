import { useState, useCallback } from 'react';
import translations from '../i18n/translations.js';

// Language is stored in localStorage so it persists across sessions.
const STORAGE_KEY = 'app_language';

function getInitialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'am' || saved === 'en') return saved;
  } catch {}
  return 'en';
}

// Singleton state — all components share the same language
let currentLang = getInitialLang();
const listeners = new Set();

function setGlobalLang(lang) {
  currentLang = lang;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  listeners.forEach(fn => fn(lang));
}

// ── useLanguage ───────────────────────────────────────────────
// Returns { t, lang, toggleLang }
//   t(key)        → translated string (falls back to English)
//   lang          → 'en' | 'am'
//   toggleLang()  → switches between en and am
export default function useLanguage() {
  const [lang, setLang] = useState(currentLang);

  // Subscribe to global language changes so all components
  // re-render when the user toggles language anywhere
  useState(() => {
    const handler = (newLang) => setLang(newLang);
    listeners.add(handler);
    return () => listeners.delete(handler);
  });

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
