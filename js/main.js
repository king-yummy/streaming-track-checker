// js/main.js (수정 완료된 코드)

import { loadStreamingList, loadTodoListData, loadNoticeList } from "./api.js";
import {
  initializeAllEventListeners,
  initializeNotificationSystem,
  requestNotificationPermission, // 새로 만든 함수 import
} from "./events.js";
import { setSchedule, setAllTodoData } from "./state.js";
import {
  initializeStreamingUI,
  renderTodoList,
  checkNewNotices,
} from "./ui.js";

/**
 * 자정이 지났을 때 투두리스트 체크 상태를 초기화하는 함수
 */
function resetTodoListAtMidnight() {
  const today = new Date().toLocaleDateString();
  const lastResetDate = localStorage.getItem("lastResetDate");

  if (lastResetDate !== today) {
    console.log("자정이 지나 투두리스트를 초기화합니다.");
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("checklist_") || key.startsWith("group_checklist_")) {
        localStorage.removeItem(key);
      }
    });
    localStorage.setItem("lastResetDate", today);
  }
}

/**
 * [신규] 필요한 경우 알림 허용 유도 팝업을 표시하는 함수
 */
function showNotificationPromptIfNeeded() {
  /* ▼▼▼▼▼ 테스트를 위해 이 조건문을 잠시 주석 처리합니다! ▼▼▼▼▼
    나중에 배포 전에는 반드시 이 주석을 풀어주세요.
  */
  /*
  if (
    !('Notification' in window) ||
    Notification.permission !== "default" ||
    localStorage.getItem("notificationPromptDismissed") === "true"
  ) {
    return;
  }
  */

  const overlay = document.getElementById("notification-prompt-overlay");
  const panel = document.getElementById("notification-prompt-panel");
  const allowBtn = document.getElementById("allow-notifications-btn");
  const denyBtn = document.getElementById("deny-notifications-btn");

  if (!overlay || !panel || !allowBtn || !denyBtn) return;

  // 모달 보이기
  overlay.classList.remove("hidden");
  panel.classList.remove("hidden");

  // '알림 받기' 버튼 클릭 시
  allowBtn.addEventListener("click", async () => {
    await requestNotificationPermission(); // 실제 권한 요청 함수 호출
    localStorage.setItem("notificationPromptDismissed", "true");
    overlay.classList.add("hidden");
    panel.classList.add("hidden");
    // ▼▼▼▼▼ [수정] 이 부분을 추가합니다 ▼▼▼▼▼
    if (token) {
      // 사용자가 성공적으로 권한을 허용했을 때만
      window.location.href = "notice.html"; // notice.html 페이지로 이동
    }
    // ▲▲▲▲▲ 여기까지 추가 ▲▲▲▲▲
  });

  // '나중에' 버튼 클릭 시
  denyBtn.addEventListener("click", () => {
    localStorage.setItem("notificationPromptDismissed", "true"); // 다시 보지 않도록 저장
    overlay.classList.add("hidden");
    panel.classList.add("hidden");
  });
}

/**
 * 앱이 처음 로드될 때 실행되는 기본 로직
 */
document.addEventListener("DOMContentLoaded", () => {
  resetTodoListAtMidnight();
  initializeAllEventListeners();

  const path = window.location.pathname;

  // 1. 메인 페이지 (index.html 또는 '/')일 경우
  if (path.endsWith("/") || path.endsWith("index.html")) {
    const loadingScreen = document.getElementById("loading-screen");
    const mainContent = document.getElementById("main-content");

    loadNoticeList().then(checkNewNotices);

    fetch("/api/superfan")
      .then((res) => res.json())
      .then((links) => {
        sessionStorage.setItem("superfanLinks", JSON.stringify(links));
      })
      .catch((err) => console.error("슈퍼팬 링크 미리 로딩 실패:", err));

    if (sessionStorage.getItem("isInitialized")) {
      const cachedSchedule = JSON.parse(
        sessionStorage.getItem("streamingSchedule")
      );
      const cachedTodoData = JSON.parse(sessionStorage.getItem("todoData"));

      if (cachedSchedule) {
        setSchedule(cachedSchedule);
        initializeStreamingUI();
      }
      if (cachedTodoData) {
        setAllTodoData(cachedTodoData);
        renderTodoList(cachedTodoData);
      }
      if (loadingScreen) loadingScreen.style.display = "none";
      if (mainContent) mainContent.classList.remove("invisible");
    } else {
      async function loadAllPrimaryData() {
        await Promise.all([loadStreamingList(), loadTodoListData()]);
        sessionStorage.setItem("isInitialized", "true");
        if (loadingScreen) loadingScreen.style.display = "none";
        if (mainContent) mainContent.classList.remove("invisible");
      }
      loadAllPrimaryData();
    }

    // ▼▼▼▼▼ [수정] 알림 팝업 함수 호출 추가 ▼▼▼▼▼
    showNotificationPromptIfNeeded();
  }
  // 2. 공지 & 캘린더 페이지 (notice.html)일 경우
  else if (path.endsWith("notice.html")) {
    initializeNotificationSystem();
    loadNoticeList().then((noticeData) => {
      renderNoticeList(noticeData, 1);
    });
  }
});

/**
 * 서비스 워커 등록 (푸시 알림용)
 */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js")
      .then((registration) => {
        console.log("Service Worker 등록 성공:", registration.scope);
      })
      .catch((error) => {
        console.log("Service Worker 등록 실패:", error);
      });
  });
}
