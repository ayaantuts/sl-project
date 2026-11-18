export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
export const canVibrate = () => typeof navigator !== 'undefined' && 'vibrate' in navigator;

export function speak(text, lang = 'en-IN') {
  if (!canSpeak() || !text) return;
  try {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang === lang) ||
      window.speechSynthesis.getVoices().find((v) => v.lang?.startsWith(lang.split('-')[0]));
    if (voice) utter.voice = voice;
    utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
  } catch {
    /* ignore */
  }
}

export function vibrate(pattern = [300, 120, 300]) {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
