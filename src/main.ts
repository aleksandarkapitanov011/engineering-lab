import './styles/main.css';
import './mechanisms';
import { savedLang, setLang } from './i18n';
import { Shell } from './app/shell';

setLang(savedLang());
new Shell(document.getElementById('app')!);

// Installed app: cache everything for offline use (production web build only; not in the native app).
const native = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
if (import.meta.env.PROD && !native && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('service worker', e));
  });
}
