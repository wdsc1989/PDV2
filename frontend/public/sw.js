/* Service worker do PDV2.

   Torna o sistema instalavel (atalho em tela cheia no tablet/celular do caixa) e
   da uma camada offline leve. Regra que evita a dor de PWA "atualizei e o caixa
   continua na versao velha":

   - navegacao (HTML): REDE PRIMEIRO. Todo deploy novo aparece na hora; so cai no
     cache da shell quando esta sem internet.
   - assets do Next (/_next/static) e icones: CACHE PRIMEIRO. Sao versionados por
     hash no nome, entao servir do cache e seguro e rapido.

   Trocar a versao (V) descarta os caches antigos no proximo activate. */

const V = 'pdv-v1';
const SHELL = '/';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const chaves = await caches.keys();
      await Promise.all(chaves.filter((k) => k !== V).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // HTML: rede primeiro, cache da shell como rede de seguranca offline
  if (req.mode === 'navigate') {
    e.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(V);
          cache.put(SHELL, res.clone());
          return res;
        } catch {
          const cache = await caches.open(V);
          return (await cache.match(SHELL)) || Response.error();
        }
      })(),
    );
    return;
  }

  // assets imutaveis (hash no nome) + icones: cache primeiro
  const estatico =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icon-') ||
    url.pathname === '/apple-touch-icon.png';

  if (estatico) {
    e.respondWith(
      (async () => {
        const cache = await caches.open(V);
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })(),
    );
  }
});
