import { loadStreamingList, loadTodoListData, loadNoticeList } from "./api.js";
import { initializeAllEventListeners } from "./events.js";
import { setSchedule, setAllTodoData } from "./state.js";
import {
  initializeStreamingUI,
  renderTodoList,
  renderNoticeList,
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
    // [수정] 공지사항 데이터 로드 후, 1페이지를 렌더링하도록 인자 추가
    loadNoticeList().then((noticeData) => renderNoticeList(noticeData, 1));
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
