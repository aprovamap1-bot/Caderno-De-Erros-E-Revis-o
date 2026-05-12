// ═══════════════════════════════════════════════════════════
//  SERVICE WORKER — Meu Caderno de Erros
//  Cache estático para funcionamento offline básico
// ═══════════════════════════════════════════════════════════

const CACHE_NAME = 'caderno-v4';
const STATIC_ASSETS = [
  'manifest.json',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap'
];

// Instalação: cache dos assets estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Ativação: limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: HTML sempre network-first para evitar que usuários fiquem presos em
// versões antigas do painel. Assets estáticos continuam com cache básico.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') {
    return;
  }

  // Requisições ao Supabase sempre vão para a rede
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  const isNavigation = event.request.mode === 'navigate';
  const acceptsHtml = event.request.headers.get('accept')?.includes('text/html');

  if (isNavigation || acceptsHtml) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match('index.html')))
    );
    return;
  }

  // Para assets: tenta cache primeiro, senão vai para rede
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache apenas respostas válidas de GET
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
