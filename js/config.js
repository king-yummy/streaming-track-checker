importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js"
);

// ================== 강제 리셋 (이번 배포에서 각 클라이언트 1회만) ==================
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 캐시리셋이 이미 끝났는지 표시하는 마커 캐시
      const MARK_CACHE = "oneoff_reset_marker";
      const MARK_URL = "/__oneoff_reset_done__";

      const markCache = await caches.open(MARK_CACHE);
      const already = await markCache.match(MARK_URL);

      if (!already) {
        // 1) 모든 기존 캐시 삭제(화이트리스트 필요하면 여기서 분기)
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));

        // 2) 마커 기록 → 다음 활성화부턴 삭제 안 함
        await markCache.put(MARK_URL, new Response("1", { status: 200 }));
      }

      // 3) 페이지 제어
      await self.clients.claim();

      // 4) (선택) 새 SW 적용 알림
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      clients.forEach((c) => c.postMessage({ type: "SW_ACTIVATED" }));
    })()
  );
});

// 대기중인 SW 즉시 올리기(선택)
self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// ================== Firebase Messaging ==================
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
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.fcmOptions?.link;
  const urlToOpen = targetUrl
    ? new URL(targetUrl, self.location.origin).href
    : "/";

  event.waitUntil(
    (async () => {
      const clientsArr = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const wc of clientsArr) {
        if (wc.url === urlToOpen) {
          await wc.focus();
          return;
        }
      }
      const opened = await self.clients.openWindow(urlToOpen);
      if (opened) await opened.focus();
    })()
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

  // 내부 navigate도 별도 캐싱 없이 통과(필요시 여기서 앱쉘 전략 추가)
  if (
    event.request.mode === "navigate" &&
    url.origin === self.location.origin
  ) {
    return;
  }

  // 나머지 요청은 그대로 통과(캐싱 미적용)
});
