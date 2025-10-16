importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js"
);

// ================== 강제 캐시/버전 관리 ==================
const SW_VERSION = "2025-10-17-01"; // ← 배포할 때마다 값 바꾸기

// 설치 즉시 대기 없이 활성화
self.addEventListener("install", () => self.skipWaiting());

// 활성화 시: 모든 기존 캐시 삭제 + 제어권 획득
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 1) 모든 캐시 삭제(화이트리스트가 필요하면 여기서 분기)
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));

      // 2) 모든 클라이언트(탭) 제어
      await self.clients.claim();

      // 3) 새 SW 활성화 통지(선택)
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      clients.forEach((c) =>
        c.postMessage({ type: "SW_ACTIVATED", version: SW_VERSION })
      );
    })()
  );
});

// 대기중인 SW를 즉시 올리기 위한 메시지 핸들러(선택)
self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// ================== Firebase Messaging ==================
const swSelf = self;

firebase.initializeApp({
  apiKey: "AIzaSyDam42H9W_iouj0rkMZDDzSWsrmx8BlVkQ",
  authDomain: "plli-checker.firebaseapp.com",
  projectId: "plli-checker",
  storageBucket: "plli-checker.firebasestorage.app",
  messagingSenderId: "517953309352",
  appId: "1:517953309352:web:a5c5a3919ff5bd8822d09d",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((_payload) => {
  // 필요 시 백그라운드 메시지 처리
});

// 알림 클릭 시 기존 탭 포커싱 또는 새 창
swSelf.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.fcmOptions?.link;
  const urlToOpen = targetUrl
    ? new URL(targetUrl, swSelf.location.origin).href
    : "/";

  event.waitUntil(
    swSelf.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientsArr) => {
        const focused = clientsArr.some((wc) =>
          wc.url === urlToOpen ? (wc.focus(), true) : false
        );
        if (!focused) {
          return swSelf.clients
            .openWindow(urlToOpen)
            .then((wc) => (wc ? wc.focus() : null));
        }
      })
  );
});

// ================== 외부 네비게이션 가로채지 않기 ==================
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 외부(origin 다른) 페이지 이동은 SW가 가로채지 않음 → 브라우저 기본 동작
  if (
    event.request.mode === "navigate" &&
    url.origin !== self.location.origin
  ) {
    return;
  }

  // (선택) 자체 페이지(navigate)는 캐시 관여 안 하고 통과
  if (
    event.request.mode === "navigate" &&
    url.origin === self.location.origin
  ) {
    return;
  }

  // 나머지 요청들은 여기서 별도 캐싱 미적용(그대로 통과)
});
