// js/main.js (최종 배포용 - Mnetplus 외부 오픈 & Superfan 섹션 완전 복원)

import {
  loadStreamingList,
  loadTodoListData,
  loadNoticeList,
  loadSuperfanLinks,
} from "./api.js";
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

function showUrgentNoticePopup() {
  if (localStorage.getItem("urgentNotice_superfan_dismissed") === "true") {
    showNotificationPromptIfNeeded();
    return;
  }

  const overlay = document.getElementById("urgent-notice-overlay");
  const panel = document.getElementById("urgent-notice-panel");
  const closeBtn = document.getElementById("close-urgent-notice-btn");
  const dismissBtn = document.getElementById("dismiss-urgent-notice-btn");

  if (!overlay || !panel || !closeBtn || !dismissBtn) {
    console.error("긴급 공지 팝업 요소를 찾을 수 없습니다.");
    showNotificationPromptIfNeeded();
    return;
  }

  const hidePopup = () => {
    overlay.classList.add("hidden");
    panel.classList.add("hidden");
    showNotificationPromptIfNeeded();
  };

  overlay.classList.remove("hidden");
  panel.classList.remove("hidden");

  closeBtn.addEventListener("click", hidePopup);
  overlay.addEventListener("click", hidePopup);
  dismissBtn.addEventListener("click", () => {
    localStorage.setItem("urgentNotice_superfan_dismissed", "true");
    hidePopup();
  });
}

// ✅ Superfan 클릭 기록 초기화 (시트 변경 대응 — 초회 1회만 실행)
const CURRENT_SUPERFAN_VERSION = "v2_choice"; // ← 배포할 때 버전명만 바꿔주면 됨
if (localStorage.getItem("superfan_version") !== CURRENT_SUPERFAN_VERSION) {
  localStorage.removeItem("superfan_clicked_links");
  localStorage.setItem("superfan_version", CURRENT_SUPERFAN_VERSION);
}

// --- 슈퍼팬 기능 상태 변수 ---
let allSuperfanLinks = [];
let clickedSuperfanLinks = new Set();
const STORAGE_KEY = "superfan_clicked_links";

// --- UI 요소 ---
const superfanButton = document.getElementById("superfan-button");
const myClicksEl = document.getElementById("my-clicks");
const totalLinksEl = document.getElementById("total-links");
const statusLight = document.getElementById("superfan-status-light");

// 업그레이드 UI 요소(있으면 사용)
const statusLabel = document.getElementById("superfan-status-label");
const statusPing = document.getElementById("superfan-status-ping");
const myShareBar = document.getElementById("my-share-bar");
const mySharePercent = document.getElementById("my-share-percent");
const superfanCounter = document.getElementById("superfan-counter");

// 상태 표시 제어
function setSuperfanStatus(mode) {
  if (!statusLight) return;
  statusLight.classList.remove(
    "bg-gray-400",
    "bg-gray-500",
    "bg-emerald-400",
    "bg-indigo-400",
    "bg-red-400"
  );
  if (statusPing) statusPing.classList.add("hidden");
  if (statusLabel) {
    statusLabel.textContent =
      mode === "ready" ? "연결됨" : mode === "done" ? "완료" : "대기중";
  }
  if (mode === "ready") {
    statusLight.classList.add("bg-emerald-400");
    if (statusPing) statusPing.classList.remove("hidden");
  } else if (mode === "done") {
    statusLight.classList.add("bg-indigo-400");
  } else {
    statusLight.classList.add("bg-gray-400");
  }
}

// 진행바/퍼센트 갱신
function updateShareProgress() {
  const my =
    parseInt((myClicksEl?.textContent || "0").replace(/\D/g, ""), 10) || 0;
  const total =
    parseInt((totalLinksEl?.textContent || "0").replace(/\D/g, ""), 10) || 0;
  const pct = total > 0 ? Math.min(100, Math.round((my / total) * 100)) : 0;
  if (myShareBar) myShareBar.style.width = pct + "%";
  if (mySharePercent) mySharePercent.textContent = String(pct);
  if (superfanCounter)
    superfanCounter.textContent = `내 클릭수 / 현재 총 링크수: ${my} / ${total}`;
}

// 클릭 데이터 로드/저장
function loadClickedLinks() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      clickedSuperfanLinks = new Set(JSON.parse(stored));
    } catch {
      clickedSuperfanLinks = new Set();
    }
  }
}
function saveClickedLinks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...clickedSuperfanLinks]));
}

// UI 갱신
function updateSuperfanUI() {
  if (!myClicksEl || !totalLinksEl || !superfanButton) return;

  myClicksEl.textContent = clickedSuperfanLinks.size;
  totalLinksEl.textContent = allSuperfanLinks.length;

  const unclickedLinks = allSuperfanLinks.filter(
    (link) => !clickedSuperfanLinks.has(link)
  );

  if (unclickedLinks.length === 0 && allSuperfanLinks.length > 0) {
    superfanButton.textContent = "All Boosts Done!";
    superfanButton.disabled = true;
    if (statusLight) statusLight.title = "모든 링크에 참여했습니다.";
    setSuperfanStatus("done");
    gtag("event", "superfan_all_links_completed", { user_id: getUserID() });
  } else if (allSuperfanLinks.length > 0) {
    superfanButton.textContent = "Click Here to Boost!";
    superfanButton.disabled = false;
    if (statusLight) statusLight.title = "참여 가능";
    setSuperfanStatus("ready");
  } else {
    superfanButton.textContent = "링크 로딩 중...";
    superfanButton.disabled = true;
    if (statusLight) statusLight.title = "링크 로딩 중";
    setSuperfanStatus("loading");
  }

  updateShareProgress();
}

// 슈퍼팬 버튼 클릭
async function handleSuperfanClick() {
  gtag("event", "click_superfan_button", { user_id: getUserID() });

  const unclickedLinks = allSuperfanLinks.filter(
    (link) => !clickedSuperfanLinks.has(link)
  );

  if (unclickedLinks.length === 0) {
    alert("모든 링크 완료!");
    return;
  }

  const randomIndex = Math.floor(Math.random() * unclickedLinks.length);
  const linkToOpen = unclickedLinks[randomIndex];

  try {
    const u = new URL(linkToOpen);
    if (
      MNET_HOSTS.includes(u.hostname) &&
      /Android/i.test(navigator.userAgent)
    ) {
      openMnetAndroid(linkToOpen);
    } else {
      openMnetExternally(linkToOpen);
    }
  } catch {
    openMnetExternally(linkToOpen);
  }

  clickedSuperfanLinks.add(linkToOpen);
  saveClickedLinks();
  updateSuperfanUI();
}

// 초기화
async function initializeSuperfanFeature() {
  if (!document.getElementById("superfan-section")) return;
  gtag("event", "superfan_feature_loaded", { user_id: getUserID() });

  loadClickedLinks();
  allSuperfanLinks = await loadSuperfanLinks();
  updateSuperfanUI();

  if (superfanButton) {
    superfanButton.addEventListener("click", handleSuperfanClick);
    superfanButton.addEventListener(
      "click",
      () => {
        superfanButton.classList.add("scale-95");
        setTimeout(() => superfanButton.classList.remove("scale-95"), 120);
      },
      { passive: true }
    );
  }

  const obsCfg = { childList: true, characterData: true, subtree: true };
  if (myClicksEl)
    new MutationObserver(updateShareProgress).observe(myClicksEl, obsCfg);
  if (totalLinksEl)
    new MutationObserver(updateShareProgress).observe(totalLinksEl, obsCfg);
  updateShareProgress();
}

// === 메인 초기화 ===
document.addEventListener("DOMContentLoaded", () => {
  resetTodoListAtMidnight();
  initializeAllEventListeners();
  document.addEventListener("click", handleMnetLinkClick); // ✅ 추가

  const path = window.location.pathname;
  if (path.endsWith("/") || path.endsWith("index.html")) {
    initializeSuperfanFeature();
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
