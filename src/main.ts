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
    navigator.serviceWorker
      .register('./sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        // An installed app is often resumed rather than started: look for a new version every time it shows.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') void reg.update().catch(() => undefined);
        });
      })
      .catch((e) => console.warn('service worker', e));
  });
  // A new version has taken over: reload once, so the phone runs it right away (not on the next start).
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    location.reload();
  });
}
