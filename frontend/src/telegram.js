const tg = window.Telegram?.WebApp;
const IS_TELEGRAM = !!tg?.initData;

// Telegram's WebApp haptic feedback is actually two separate APIs:
//   - HapticFeedback.impactOccurred(style) — style must be one of
//     'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
//   - HapticFeedback.notificationOccurred(type) — type must be one
//     of 'success' | 'error' | 'warning'
// Passing 'success' to impactOccurred() throws
// WebAppHapticImpactStyleInvalid inside the Telegram client, which
// was surfacing as a visible error popup every time we called
// telegram.haptic('success') after an order/action succeeded. This
// routes each call to the correct underlying API automatically.
const NOTIFICATION_TYPES = ['success', 'error', 'warning'];

export const telegram = {
  init() { if (tg) { tg.ready(); tg.expand(); } },
  getInitData() { return tg?.initData || ''; },
  getUser() { return tg?.initDataUnsafe?.user || null; },
  haptic(type = 'light') {
    if (!tg?.HapticFeedback) return;
    if (NOTIFICATION_TYPES.includes(type)) {
      tg.HapticFeedback.notificationOccurred(type);
    } else {
      tg.HapticFeedback.impactOccurred(type);
    }
  },
  alert(msg) { tg ? tg.showAlert(msg) : window.alert(msg); },
  showBackButton(fn) { if (tg?.BackButton) { tg.BackButton.show(); tg.BackButton.onClick(fn); } },
  hideBackButton() { tg?.BackButton?.hide(); },
  close() { tg?.close(); }
};

export default telegram;
