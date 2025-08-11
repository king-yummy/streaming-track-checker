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
});
