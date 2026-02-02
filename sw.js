const CACHE_NAME = 'aws-master-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './data.json',
  './ogp.png'
];

// インストール時にファイルをキャッシュする
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// リクエスト時にキャッシュがあればそれを返す（オフライン対応）
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );

});
