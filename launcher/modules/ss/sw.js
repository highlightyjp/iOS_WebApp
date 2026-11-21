/* のくす書庫 オフライン用 Service Worker（ss22）
   アプリ側の cache 名の build は index.html の SS_BUILD と build.txt と必ず揃える。
   データ側の cache（ss-data-v1）はアプリの版から切り離し、版上げで保存分を消さない。
   データの世代交代は、ページ側が索引の generated_at を見て入れ替える。
   役割：ページ本体とフォントを先に保持し、索引・本文・AA画像は読まれた分と
   「全件保存」「リーダーの保存」で入れられた分を端末内に保持して、オフラインでも返す。
   build.txt だけは版の照合に使うため、絶対にキャッシュから返さない。 */
'use strict';
var SS_SW_BUILD = '2026-11-21-ss22';
var APP_CACHE = 'ss-app-' + SS_SW_BUILD;
var DATA_CACHE = 'ss-data-v1';
var APP_ASSETS = ['./', 'index.html', 'fonts/aa.woff2', 'fonts/aa-mona.woff2', 'fonts/NOTICE.txt'];

function keyOf(url) {
  var u = new URL(url);
  u.searchParams.delete('ts');
  u.searchParams.delete('v');
  u.searchParams.delete('sv');
  u.hash = '';
  return u.href;
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(APP_CACHE).then(function (c) {
      return Promise.all(APP_ASSETS.map(function (a) {
        var url = new URL(a, self.registration.scope).href;
        return fetch(url, { cache: 'no-store' }).then(function (r) {
          if (r && r.ok) return c.put(keyOf(url), r);
        }).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (n) {
        /* 消すのは古いアプリ側だけ。データ側はページ側が移行・世代交代を管理する */
        if (n.indexOf('ss-app-') === 0 && n !== APP_CACHE) return caches.delete(n);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var u;
  try { u = new URL(req.url); } catch (err) { return; }
  if (u.origin !== self.location.origin) return;
  var scopePath = new URL(self.registration.scope).pathname;
  if (u.pathname.indexOf(scopePath) !== 0) return;
  if (/\/build\.txt$/.test(u.pathname)) return; /* 版の照合は常に実ネットワーク。失敗はページ側が握る */
  var key = keyOf(req.url);
  var isData = /\/data\//.test(u.pathname);
  var cacheName = isData ? DATA_CACHE : APP_CACHE;
  var isNav = req.mode === 'navigate' || /\/index\.html$/.test(u.pathname) || u.pathname === scopePath;
  if (isNav) {
    /* ページ本体はネットワーク優先（版上げを滞らせない）。落ちている時だけ保持分を返す */
    e.respondWith(
      fetch(req).then(function (r) {
        if (r && r.ok) {
          var cl = r.clone();
          caches.open(APP_CACHE).then(function (c) { c.put(key, cl).catch(function () {}); });
        }
        return r;
      }).catch(function () {
        return caches.open(APP_CACHE).then(function (c) { return c.match(key); }).then(function (hit) {
          if (hit) return hit;
          return caches.open(APP_CACHE).then(function (c) { return c.match(keyOf(new URL('index.html', self.registration.scope).href)); });
        });
      })
    );
    return;
  }
  /* データとフォントは保持優先。無い時だけ取りに行き、取れたら保持する */
  e.respondWith(
    caches.open(cacheName).then(function (c) {
      return c.match(key).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (r) {
          if (r && r.ok) { var cl = r.clone(); c.put(key, cl).catch(function () {}); }
          return r;
        });
      });
    })
  );
});
