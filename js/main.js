// js/main.js (최종 배포용 - 모든 버튼 클릭 시 페이지 이동)

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

function showNotificationPromptIfNeeded() {
  if (localStorage.getItem("notificationPrompt_v2_shown") === "true") {
    return;
  }

  const overlay = document.getElementById("notification-prompt-overlay");
  const panel = document.getElementById("notification-prompt-panel");
  const allowBtn = document.getElementById("allow-notifications-btn");
  const denyBtn = document.getElementById("deny-notifications-btn");

  if (!overlay || !panel || !allowBtn || !denyBtn) return;

  overlay.classList.remove("hidden");
  panel.classList.remove("hidden");

  allowBtn.addEventListener("click", async () => {
    const token = await requestNotificationPermission();
    localStorage.setItem("notificationPrompt_v2_shown", "true");
    overlay.classList.add("hidden");
    panel.classList.add("hidden");

    // '알림 받기'를 누르면 무조건 페이지 이동
    window.location.href = "notice.html";
  });

  denyBtn.addEventListener("click", () => {
    localStorage.setItem("notificationPrompt_v2_shown", "true");
    overlay.classList.add("hidden");
    panel.classList.add("hidden");

    // ▼▼▼▼▼ [수정] '관심없어요'를 눌러도 페이지 이동하도록 코드 추가 ▼▼▼▼▼
    window.location.href = "notice.html";
    // ▲▲▲▲▲ 여기까지 추가 ▲▲▲▲▲
  });
}

/**
 * [신규] 슈퍼팬 관련 긴급 공지 팝업을 띄우는 함수
 */
function showUrgentNoticePopup() {
  // 사용자가 '다시 보지 않기'를 선택했는지 확인
  if (localStorage.getItem("urgentNotice_superfan_dismissed") === "true") {
    // ▼▼▼▼▼ [수정] 긴급 공지를 이미 본 사람에게는 바로 알림 팝업을 띄웁니다. ▼▼▼▼▼
    showNotificationPromptIfNeeded();
    // ▲▲▲▲▲ 여기까지 수정 ▲▲▲▲▲
    return;
  }

  const overlay = document.getElementById("urgent-notice-overlay");
  const panel = document.getElementById("urgent-notice-panel");
  const closeBtn = document.getElementById("close-urgent-notice-btn");
  const dismissBtn = document.getElementById("dismiss-urgent-notice-btn");

  if (!overlay || !panel || !closeBtn || !dismissBtn) {
    console.error("긴급 공지 팝업 요소를 찾을 수 없습니다.");
    // ▼▼▼▼▼ [수정] 긴급 공지 팝업 요소가 없어도 알림 팝업은 시도합니다. ▼▼▼▼▼
    showNotificationPromptIfNeeded();
    // ▲▲▲▲▲ 여기까지 수정 ▲▲▲▲▲
    return;
  }

  // 팝업 숨기기 함수
  const hidePopup = () => {
    overlay.classList.add("hidden");
    panel.classList.add("hidden");
    // ▼▼▼▼▼ [수정] 긴급 공지 팝업이 닫힌 직후, 알림 팝업을 띄웁니다. ▼▼▼▼▼
    showNotificationPromptIfNeeded();
    // ▲▲▲▲▲ 여기까지 수정 ▲▲▲▲▲
  };

  // 팝업 보이기
  overlay.classList.remove("hidden");
  panel.classList.remove("hidden");

  // 'X' 버튼 클릭 시
  closeBtn.addEventListener("click", hidePopup);

  // 팝업 바깥 영역 클릭 시
  overlay.addEventListener("click", hidePopup);

  // '다시 보지 않기' 버튼 클릭 시
  dismissBtn.addEventListener("click", () => {
    localStorage.setItem("urgentNotice_superfan_dismissed", "true");
    hidePopup();
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
    // showUrgentNoticePopup(); // 긴급 공지 팝업 호출
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
