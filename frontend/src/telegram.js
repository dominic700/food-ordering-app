const tg = window.Telegram?.WebApp;
const IS_TELEGRAM = !!tg?.initData;

export const telegram = {
  init() { if (tg) { tg.ready(); tg.expand(); } },
  getInitData() { return tg?.initData || ''; },
  getUser() { return tg?.initDataUnsafe?.user || null; },
  haptic(type = 'light') { tg?.HapticFeedback?.impactOccurred(type); },
  alert(msg) { tg ? tg.showAlert(msg) : window.alert(msg); },
  showBackButton(fn) { if (tg?.BackButton) { tg.BackButton.show(); tg.BackButton.onClick(fn); } },
  hideBackButton() { tg?.BackButton?.hide(); },
  close() { tg?.close(); }
};

export default telegram;
