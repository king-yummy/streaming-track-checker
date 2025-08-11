// firebase-messaging-sw.js

// Firebase 앱 및 메시징 모듈을 가져옵니다.
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js"
);

// Firebase 앱을 초기화합니다.
firebase.initializeApp({
  apiKey: "AIzaSyDam42H9W_iouj0rkMZDDzSWsrmx8BlVkQ",
  authDomain: "plli-checker.firebaseapp.com",
  projectId: "plli-checker",
  storageBucket: "plli-checker.firebasestorage.app",
  messagingSenderId: "517953309352",
  appId: "1:517953309352:web:a5c5a3919ff5bd8822d09d",
});

const messaging = firebase.messaging();

// 중복 알림 방지를 위한 변수
let lastNotificationTimestamp = 0;

// 백그라운드에서 메시지를 수신했을 때 실행될 핸들러
messaging.onBackgroundMessage((payload) => {
  console.log("📥 백그라운드 메시지 수신:", payload);

  const now = Date.now();
  // 마지막 알림 후 2초 이내에 온 알림은 중복으로 간주하고 무시합니다.
  if (now - lastNotificationTimestamp < 2000) {
    console.log("🔥 중복 알림(유령) 감지! 무시합니다.");
    return;
  }
  lastNotificationTimestamp = now;

  // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
  // 여기가 새로 추가된 알림 구분 로직입니다.
  // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
  const notificationTitle = payload.notification.title || "새로운 알림";
  const notificationOptions = {
    body: payload.notification.body || "",
    tag: "plli-notification-tag", // 알림을 하나로 묶어주는 태그
  };

  // 제목에 포함된 아이콘으로 알림 종류를 구분합니다.
  if (notificationTitle.includes("📢")) {
    notificationOptions.icon = "/icon-512.png"; // 공지용 아이콘
  } else if (notificationTitle.includes("🗓️")) {
    notificationOptions.icon = "/icon-192.png"; // 캘린더용 아이콘 (다른 아이콘으로 변경 가능)
  } else {
    notificationOptions.icon = "/icon-192.png"; // 기본 아이콘
  }
  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

  // 최종적으로 사용자에게 알림을 표시합니다.
  self.registration.showNotification(notificationTitle, notificationOptions);
});
