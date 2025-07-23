import { loadStreamingList, loadTodoListData } from './api.js';
import { initializeAllEventListeners } from './events.js';
import { setSchedule, setAllTodoData } from './state.js';
import { initializeStreamingUI, renderTodoList } from './ui.js';

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

document.addEventListener("DOMContentLoaded", () => {
  resetTodoListAtMidnight();
  initializeAllEventListeners();

  const loadingScreen = document.getElementById("loading-screen");
  const mainContent = document.getElementById("main-content");

  if (sessionStorage.getItem("isInitialized")) {
    const cachedSchedule = JSON.parse(sessionStorage.getItem("streamingSchedule"));
    const cachedTodoData = JSON.parse(sessionStorage.getItem("todoData"));

    if (cachedSchedule) {
      setSchedule(cachedSchedule);
      initializeStreamingUI();
    }
    if (cachedTodoData) {
      setAllTodoData(cachedTodoData);
      renderTodoList(cachedTodoData);
    }

    loadingScreen.style.display = "none";
    mainContent.classList.remove("invisible");
  } else {
    async function loadAllData() {
      await Promise.all([loadStreamingList(), loadTodoListData()]);
      sessionStorage.setItem("isInitialized", "true");
      loadingScreen.style.display = "none";
      mainContent.classList.remove("invisible");
    }
    loadAllData();
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js")
      .then((registration) => {
        console.log(
          "Service Worker 등록 성공:",
          registration.scope
        );
      })
      .catch((error) => {
        console.log("Service Worker 등록 실패:", error);
      });
  });
}