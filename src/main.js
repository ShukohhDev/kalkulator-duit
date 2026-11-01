import './index.css';
import { mountApp } from './App.js';

const root = document.getElementById('root');
if (root) {
  mountApp(root);
}

if ('serviceWorker' in navigator && (import.meta.env?.PROD || window.location.search.includes('pwa=1'))) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // registrasi offline service worker
    });
  });
}

