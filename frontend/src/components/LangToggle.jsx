import useLanguage from '../hooks/useLanguage.js';

// Small toggle button shown in every header.
// Tapping it switches between English and Amharic globally.
export default function LangToggle() {
  const { lang, toggleLang } = useLanguage();

  return (
    <button
      onClick={toggleLang}
      style={{
        background:   lang === 'am' ? 'var(--red)' : 'rgba(255,255,255,0.15)',
        color:        '#fff',
        border:       'none',
        borderRadius: 8,
        fontSize:     12,
        fontWeight:   800,
        padding:      '5px 10px',
        cursor:       'pointer',
        letterSpacing: 0.5,
        flexShrink:   0,
        minWidth:     42,
        textAlign:    'center',
      }}
    >
      {lang === 'en' ? 'አማ' : 'EN'}
    </button>
  );
}
