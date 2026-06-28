import { useState, useEffect, useCallback } from 'react';
import translations from '../i18n/translations.js';

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

function setGlobalLang(lang) {
  _lang = lang;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  _listeners.forEach(fn => fn(lang));
}

// ── useLanguage ───────────────────────────────────────────────
// Returns { t, lang, toggleLang }
//   t(key)       → translated string, falls back to English
//   lang         → 'en' | 'am'
//   toggleLang() → switches between en and am globally
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
