import { loadStreamingList, loadTodoListData, loadNoticeList } from "./api.js";
import {
  initializeAllEventListeners,
  initializeNotificationSystem,
} from "./events.js";

import { setSchedule, setAllTodoData } from "./state.js";
import {
  initializeStreamingUI,
  renderTodoList,
  renderNoticeList,
  checkNewNotices,
} from "./ui.js";

import {
  initializeAllEventListeners,
  initializeNotificationSystem,
} from "./events.js";

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

    // 새로운 공지가 있는지 확인해서 📢 아이콘에 점 표시
    loadNoticeList().then(checkNewNotices);

    // ▼▼▼▼▼ [추가!] 슈퍼팬 링크 목록 미리 불러와서 캐싱하기 ▼▼▼▼▼
    fetch("/api/superfan")
      .then((res) => res.json())
      .then((links) => {
        sessionStorage.setItem("superfanLinks", JSON.stringify(links));
      })
      .catch((err) => console.error("슈퍼팬 링크 미리 로딩 실패:", err));
    // ▲▲▲▲▲ 여기까지 추가 ▲▲▲▲▲

    if (sessionStorage.getItem("isInitialized")) {
      // 캐시된 데이터로 화면 빠르게 로드
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
      // 모든 데이터 새로 로드
      async function loadAllPrimaryData() {
        await Promise.all([loadStreamingList(), loadTodoListData()]);
        sessionStorage.setItem("isInitialized", "true");
        if (loadingScreen) loadingScreen.style.display = "none";
        if (mainContent) mainContent.classList.remove("invisible");
      }
      loadAllPrimaryData();
    }
  }
  // 2. 공지 & 캘린더 페이지 (notice.html)일 경우
  else if (path.endsWith("notice.html")) {
    // 알림 토글 스위치 관련 기능을 실행하는 함수를 호출합니다.
    initializeNotificationSystem();

    const cachedNotices = sessionStorage.getItem("noticeData");
    if (cachedNotices) {
      const noticeData = JSON.parse(cachedNotices);
      renderNoticeList(noticeData, 1);
    } else {
      loadNoticeList().then((noticeData) => {
        sessionStorage.setItem("noticeData", JSON.stringify(noticeData));
        renderNoticeList(noticeData, 1);
      });
    }
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
