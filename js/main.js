// js/main.js (최종 배포용 - Mnetplus 외부 오픈 & Superfan 섹션 완전 복원)

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
import { renderNoticeList } from "./ui.js";

// ==== Mnetplus 외부 오픈 유틸 ====
const MNET_HOSTS = ["share.mnetplus.world", "mnetplus.world"];

// --- iOS / PWA 감지 유틸 ---
function isiOS() {
  return /iP(hone|ad|od)/i.test(navigator.userAgent);
}
function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    navigator.standalone
  );
}

function openMnetExternally(url) {
  if (isiOS() && isStandalone()) {
    window.location.href = url;
    return;
  }
  setTimeout(() => {
    const newWindow = window.open(url, "_blank");
    if (!newWindow) {
      window.location.href = url;
    }
  }, 50);
}

function openMnetAndroid(url) {
  // 패키지명 확인 필요. 기본값:
  const pkg = "com.cjenm.mnetplus";
  const intentUrl =
    "intent://" +
    url.replace(/^https?:\/\//, "") +
    "#Intent;scheme=https;package=" +
    pkg +
    ";S.browser_fallback_url=" +
    encodeURIComponent(url) +
    ";end";
  location.href = intentUrl;
}

// 엠넷 링크는 항상 외부(앱/브라우저)로 열기: 전역 클릭 위임
function handleMnetLinkClick(e) {
  const a = e.target.closest?.("a[href]");
  if (!a) return;
  const u = new URL(a.href, location.href);
  if (!MNET_HOSTS.includes(u.hostname)) return;
  e.preventDefault();
  if (/Android/i.test(navigator.userAgent)) {
    openMnetAndroid(a.href);
  } else {
    openMnetExternally(a.href);
  }
}

function resetTodoListAtMidnight() {
  const today = new Date().toLocaleDateString();
  const lastResetDate = localStorage.getItem("lastResetDate");

  if (lastResetDate !== today) {
    console.log("자정이 지나 투두리스트를 초기화합니다.");

    // ✔ 투두 체크 초기화
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("checklist_") || key.startsWith("group_checklist_")) {
        localStorage.removeItem(key);
      }
    });

    // ✔ 그룹 참여카운트 중복방지용 reported_ 키 모두 초기화
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("reported_")) {
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
    window.location.href = "notice.html";
  });

  denyBtn.addEventListener("click", () => {
    localStorage.setItem("notificationPrompt_v2_shown", "true");
    overlay.classList.add("hidden");
    panel.classList.add("hidden");
    window.location.href = "notice.html";
  });
}

// 업그레이드 UI 요소(있으면 사용)
const statusLabel = document.getElementById("superfan-status-label");
const statusPing = document.getElementById("superfan-status-ping");
const myShareBar = document.getElementById("my-share-bar");
const mySharePercent = document.getElementById("my-share-percent");
const superfanCounter = document.getElementById("superfan-counter");

// === 메인 초기화 ===
document.addEventListener("DOMContentLoaded", () => {
  resetTodoListAtMidnight();
  initializeAllEventListeners();
  document.addEventListener("click", handleMnetLinkClick); // ✅ 추가

  const path = window.location.pathname;
  if (path.endsWith("/") || path.endsWith("index.html")) {
    const loadingScreen = document.getElementById("loading-screen");
    const mainContent = document.getElementById("main-content");
    loadNoticeList().then(checkNewNotices);

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

// === Service Worker 등록 ===
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

// === 스밍리스트 내부/외부 스크롤 핸드오프 (모바일/PC 공통) ===
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;
  if (!(path.endsWith("/") || path.endsWith("index.html"))) return;

  const el = document.querySelector(".scroll-inner");
  if (!el) return;

  // ✅ 관성 스크롤을 살리기 위해 preventDefault / 수동 scrollTop 조작 제거
  //    브라우저에게 스크롤 제어를 완전히 맡기면 슝슝~ 자연스러워집니다.

  // 단순히 스크롤 상태만 감시(선택적)
  const updateEdgeState = () => {
    const atTop = el.scrollTop <= 0;
    const atBottom =
      Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight;
    el.classList.toggle("at-top", atTop);
    el.classList.toggle("at-bottom", atBottom);
  };

  el.addEventListener("scroll", updateEdgeState, { passive: true });
  updateEdgeState();

  // ✨ 이제 터치나 휠 이벤트를 직접 제어하지 않습니다.
  //     -> 브라우저가 자체 관성 스크롤 + 체이닝을 담당합니다.
});
