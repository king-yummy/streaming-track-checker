importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js"
);

// [수정] 서비스 워커가 클라이언트를 제어할 수 있도록 self 참조
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

messaging.onBackgroundMessage((payload) => {
  // 백그라운드 메시지 수신 (현재는 특별한 처리 없음)
});

// [추가] 알림 클릭 이벤트 리스너
swSelf.addEventListener("notificationclick", (event) => {
  // 알림창 닫기
  event.notification.close();

  // 서버에서 보낸 fcmOptions.link 값을 확인
  const targetUrl = event.notification.data?.fcmOptions?.link;

  // targetUrl이 있으면 해당 URL로, 없으면 기본 URL('/')로 이동
  const urlToOpen = targetUrl
    ? new URL(targetUrl, swSelf.location.origin).href
    : "/";

  // 이미 열려있는 탭이 있으면 그 탭을 활성화하고, 없으면 새 탭으로 열기
  event.waitUntil(
    swSelf.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientsArr) => {
        const hadWindowToFocus = clientsArr.some((windowClient) =>
          windowClient.url === urlToOpen ? (windowClient.focus(), true) : false
        );

        if (!hadWindowToFocus) {
          swSelf.clients
            .openWindow(urlToOpen)
            .then((windowClient) =>
              windowClient ? windowClient.focus() : null
            );
        }
      })
  );
});
