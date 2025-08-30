// js/main.js (최종 배포용 - 모든 사용자에게 1회 표시)

import { loadStreamingList, loadTodoListData, loadNoticeList } from "./api.js";
import {
  initializeAllEventListeners,
  initializeNotificationSystem,
  requestNotificationPermission,
} from "./events.js";
import { setSchedule, setAllTodoData } from "./state.js";
import {
  initializeStreamingUI,
  renderTodoList,
  checkNewNotices,
} from "./ui.js";

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
 * 필요한 경우 알림 허용 유도 팝업을 표시하는 함수 (수정됨)
 */
function showNotificationPromptIfNeeded() {
  // ▼▼▼▼▼ [수정] 새로운 버전의 팝업 확인 로직 ▼▼▼▼▼
  // 이전에 팝업을 봤는지 여부와 상관없이, 'v2' 팝업을 본 적이 없다면 띄웁니다.
  if (localStorage.getItem("notificationPrompt_v2_shown") === "true") {
    return;
  }
  // ▲▲▲▲▲ 여기까지 수정 ▲▲▲▲▲

  const overlay = document.getElementById("notification-prompt-overlay");
  const panel = document.getElementById("notification-prompt-panel");
  const allowBtn = document.getElementById("allow-notifications-btn");
  const denyBtn = document.getElementById("deny-notifications-btn");

  if (!overlay || !panel || !allowBtn || !denyBtn) return;

  overlay.classList.remove("hidden");
  panel.classList.remove("hidden");

  allowBtn.addEventListener("click", async () => {
    const token = await requestNotificationPermission();
    localStorage.setItem("notificationPrompt_v2_shown", "true"); // 새 버전 확인 기록 저장
    overlay.classList.add("hidden");
    panel.classList.add("hidden");

    if (token) {
      window.location.href = "notice.html";
    }
  });

  denyBtn.addEventListener("click", () => {
    localStorage.setItem("notificationPrompt_v2_shown", "true"); // 새 버전 확인 기록 저장
    overlay.classList.add("hidden");
    panel.classList.add("hidden");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  resetTodoListAtMidnight();
  initializeAllEventListeners();
  const path = window.location.pathname;
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
    showNotificationPromptIfNeeded();
  } else if (path.endsWith("notice.html")) {
    initializeNotificationSystem();
    loadNoticeList().then((noticeData) => {
      renderNoticeList(noticeData, 1);
    });
  }
});

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
