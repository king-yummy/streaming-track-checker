importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyDam42H9W_iouj0rkMZDDzSWsrmx8BlVkQ",
  authDomain: "plli-checker.firebaseapp.com",
  projectId: "plli-checker",
  storageBucket: "plli-checker.firebasestorage.app",
  messagingSenderId: "517953309352",
  appId: "1:517953309352:web:a5c5a3919ff5bd8822d09d",
});

const messaging = firebase.messaging();

// 마지막 알림 시간을 기록하기 위한 변수
let lastNotificationTimestamp = 0;

messaging.onBackgroundMessage((payload) => {
  console.log("📥 백그라운드 메시지 수신:", payload);

  const now = Date.now();
  const timeSinceLastNotification = now - lastNotificationTimestamp;

  // 마지막 알림 후 2초가 지나지 않았다면, 중복으로 간주하고 무시합니다.
  if (timeSinceLastNotification < 2000) {
    console.log("🔥 중복 알림(유령) 감지! 무시합니다.");
    return; // 함수를 즉시 종료
  }

  // 2초가 지났다면, 현재 시간을 기록하고 알림을 띄웁니다.
  lastNotificationTimestamp = now;
  console.log("✅ 정상 알림(아이콘 O) 표시. 쿨타임 잠금을 설정합니다.");

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icon-192.png",
    tag: "plli-notification-tag",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
