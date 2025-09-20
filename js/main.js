// js/main.js (최종 배포용 - 모든 버튼 클릭 시 페이지 이동)

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

// --- 슈퍼팬 기능 상태 변수 ---
let allSuperfanLinks = [];
let clickedSuperfanLinks = new Set();
const STORAGE_KEY = "superfan_clicked_links";

// --- UI 요소 ---
const superfanButton = document.getElementById("superfan-button");
const myClicksEl = document.getElementById("my-clicks");
const totalLinksEl = document.getElementById("total-links");
const statusLight = document.getElementById("superfan-status-light");

// [NEW] 업그레이드 UI 요소(있으면 사용, 없으면 무시)
const statusLabel = document.getElementById("superfan-status-label");
const statusPing = document.getElementById("superfan-status-ping");
const myShareBar = document.getElementById("my-share-bar");
const mySharePercent = document.getElementById("my-share-percent");
const superfanCounter = document.getElementById("superfan-counter");

// [NEW] 상태 라이트/라벨/핑 제어
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

// [NEW] 진행바/퍼센트 갱신
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

/** 클릭한 링크 목록을 브라우저 저장소에서 불러오기 */
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

/** 클릭한 링크 목록을 브라우저 저장소에 저장하기 */
function saveClickedLinks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...clickedSuperfanLinks]));
}

/** UI 업데이트 (카운터, 버튼 상태) */
function updateSuperfanUI() {
  if (!myClicksEl || !totalLinksEl || !superfanButton) return;

  myClicksEl.textContent = clickedSuperfanLinks.size;
  totalLinksEl.textContent = allSuperfanLinks.length;

  const unclickedLinks = allSuperfanLinks.filter(
    (link) => !clickedSuperfanLinks.has(link)
  );

  if (unclickedLinks.length === 0 && allSuperfanLinks.length > 0) {
    superfanButton.textContent = "모든 링크 완료! ✅";
    superfanButton.disabled = true;
    if (statusLight) statusLight.title = "모든 링크에 참여했습니다.";
    setSuperfanStatus("done");
  } else if (allSuperfanLinks.length > 0) {
    superfanButton.textContent = "🚀 슈퍼PLLI팬 부스터";
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

/** 슈퍼팬 버튼 클릭 이벤트 핸들러 */
async function handleSuperfanClick() {
  gtag("event", "click_superfan_button", { user_id: getUserID() });

  const unclickedLinks = allSuperfanLinks.filter(
    (link) => !clickedSuperfanLinks.has(link)
  );

  if (unclickedLinks.length === 0) {
    alert(
      "모든 링크에 참여해주셔서 감사합니다! 새로운 링크가 올라오면 다시 활성화됩니다."
    );
    return;
  }

  // 중복되지 않은 링크 중 하나를 랜덤으로 선택
  const randomIndex = Math.floor(Math.random() * unclickedLinks.length);
  const linkToOpen = unclickedLinks[randomIndex];

  // 새 탭으로 링크 열기
  window.open(linkToOpen, "_blank");

  // 클릭한 링크로 기록
  clickedSuperfanLinks.add(linkToOpen);
  saveClickedLinks();
  updateSuperfanUI();
}

/** 슈퍼팬 기능 초기화 */
async function initializeSuperfanFeature() {
  if (!document.getElementById("superfan-section")) return; // 관련 섹션이 없으면 실행 안함

  loadClickedLinks();
  allSuperfanLinks = await loadSuperfanLinks();
  updateSuperfanUI();

  if (superfanButton) {
    superfanButton.addEventListener("click", handleSuperfanClick);

    // [NEW] 버튼 마이크로 인터랙션
    superfanButton.addEventListener(
      "click",
      () => {
        superfanButton.classList.add("scale-95");
        setTimeout(() => superfanButton.classList.remove("scale-95"), 120);
      },
      { passive: true }
    );
  }

  // [NEW] 숫자 변화 자동 반영(진행바/퍼센트)
  const obsCfg = { childList: true, characterData: true, subtree: true };
  if (myClicksEl)
    new MutationObserver(updateShareProgress).observe(myClicksEl, obsCfg);
  if (totalLinksEl)
    new MutationObserver(updateShareProgress).observe(totalLinksEl, obsCfg);
  updateShareProgress();
}

document.addEventListener("DOMContentLoaded", () => {
  resetTodoListAtMidnight();
  initializeAllEventListeners();
  const path = window.location.pathname;
  if (path.endsWith("/") || path.endsWith("index.html")) {
    initializeSuperfanFeature(); // 슈퍼팬 기능 초기화 함수 호출 추가
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
