import { getUserID } from "./utils.js";
import { openDetailsModal, closeDetailsModal } from "./ui.js";
import { allTodoData } from "./state.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getMessaging,
  getToken,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";
import { onMessage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

const findItemDataById = (id) => allTodoData.find((item) => item.ID === id);
const VAPID_KEY =
  "BHKOgIoE52ImNaT3yKv_w1yJVSPL2WfUZHCp2VKUF0DvWiOVi2cNFQ-qS2XzjRt2HliwcK-U-BFrDXbxBfpI7MA";

// [추가] 중복 호출 방지를 위한 '진행 중' 플래그
const reporting = new Set();

// Firebase 앱 설정
const firebaseConfig = {
  apiKey: "AIzaSyDam42H9W_iouj0rkMZDDzSWsrmx8BlVkQ",
  authDomain: "plli-checker.firebaseapp.com",
  projectId: "plli-checker",
  storageBucket: "plli-checker.firebasestorage.app",
  messagingSenderId: "517953309352",
  appId: "1:517953309352:web:a5c5a3919ff5bd8822d09d",
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
let currentToken = "";

// ▼▼▼ 브라우저에 알림 권한 요청 및 토큰 저장 ▼▼▼
/**
 * 브라우저에 알림 권한을 명시적으로 요청하고 서버에 토큰을 저장합니다.
 * @returns {Promise<string|null>} 성공 시 FCM 토큰, 실패 시 null
 */
export async function requestNotificationPermission() {
  let swReg;
  try {
    swReg = await navigator.serviceWorker.ready;
  } catch (e) {
    console.error("[알림] 서비스워커 준비 실패:", e);
    alert("알림 기능을 초기화하는 데 실패했습니다.");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      alert(
        "알림이 허용되지 않았습니다. 알림을 받으려면 브라우저 설정에서 권한을 변경해주세요."
      );
      return null;
    }
  } catch (e) {
    console.error("[알림] 권한 요청 중 오류:", e);
    return null;
  }

  try {
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });
    if (token) {
      currentToken = token;
      await fetch("/api/save-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: currentToken, alarmOptIn: true }),
      });
      console.log("[알림] 권한 획득 및 토큰 저장 성공:", currentToken);
      const alarmToggle = document.getElementById("alarm-toggle");
      if (alarmToggle) alarmToggle.checked = true;
      return token;
    }
    return null;
  } catch (err) {
    console.error("[알림] FCM 토큰 획득 실패:", err);
    return null;
  }
}
// ▲▲▲ 여기까지 ▲▲▲

/**
 * 알림 설정을 서버에 저장
 */
async function saveNotificationSettings() {
  if (!currentToken) {
    console.log("FCM 토큰이 없어서 설정을 저장할 수 없습니다.");
    return;
  }
  const noticeOptIn = document.getElementById("notice-toggle").checked;
  const calendarOptIn = document.getElementById("calendar-toggle").checked;

  try {
    await fetch("/api/save-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: currentToken, noticeOptIn, calendarOptIn }),
    });
    console.log("알림 설정이 저장되었습니다:", { noticeOptIn, calendarOptIn });
  } catch (error) {
    console.error("알림 설정 저장 실패:", error);
  }
}

/**
 * 알림 시스템 초기화 (통합)
 */
export async function initializeNotificationSystem() {
  const alarmToggle = document.getElementById("alarm-toggle");
  if (!alarmToggle) return;

  let swReg;
  try {
    swReg = await navigator.serviceWorker.ready;
  } catch (e) {
    console.error("[알림] 서비스워커 준비 실패:", e);
    return;
  }

  async function ensurePermissionAndToken() {
    if (Notification.permission === "default") {
      const p = await Notification.requestPermission();
      if (p !== "granted") return null;
    } else if (Notification.permission === "denied") {
      return null;
    }
    try {
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });
      currentToken = token || "";
      return currentToken || null;
    } catch (err) {
      console.error("[알림] FCM 토큰 획득 실패:", err);
      return null;
    }
  }

  async function saveCurrentSettings() {
    if (!currentToken) return;
    try {
      await fetch("/api/save-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: currentToken,
          alarmOptIn: alarmToggle.checked, // 통합 값 전송
        }),
      });
    } catch (e) {
      console.error("[알림] 설정 저장 실패:", e);
    }
  }

  try {
    if (Notification.permission === "granted") {
      const token = await ensurePermissionAndToken();
      if (token) {
        currentToken = token;
        const res = await fetch(
          `/api/save-token?token=${encodeURIComponent(token)}`
        );
        if (res.ok) {
          const { alarmOptIn = false } = await res.json();
          alarmToggle.checked = !!alarmOptIn;
        }
      }
    }
  } catch (e) {
    console.error("[알림] 초기 설정 복원 실패:", e);
  }

  async function onToggleChange() {
    const token = await ensurePermissionAndToken();
    if (!token) {
      alarmToggle.checked = false;
      alert("브라우저 알림 권한이 필요합니다.");
      return;
    }
    await saveCurrentSettings();
    console.log("[알림] 설정 저장됨:", { alarm: alarmToggle.checked });
  }

  alarmToggle.addEventListener("change", onToggleChange);

  onMessage(messaging, (payload) => {
    const n = payload.notification || {};
    if (!n.title && !n.body) return;
    try {
      new Notification(n.title || "알림", { body: n.body || "" });
    } catch (e) {
      console.log("[알림] foreground 표시 실패:", e);
    }
  });
}

// --------- TODO 리스너들 ---------
export function addTodoEventListeners() {
  const userID = getUserID();
  document.querySelectorAll(".accordion-header").forEach((header) => {
    header.addEventListener("click", (e) => {
      if (e.target.matches('input[type="checkbox"]')) return;
      const content = header.nextElementSibling;
      const arrow = header.querySelector(".accordion-arrow");
      if (content.style.maxHeight) {
        content.style.maxHeight = null;
        arrow.style.transform = "rotate(0deg)";
      } else {
        content.style.maxHeight = content.scrollHeight + "px";
        arrow.style.transform = "rotate(180deg)";
      }
    });
  });

  document.querySelectorAll(".item-check").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      const isChecked = e.target.checked;
      localStorage.setItem(`checklist_${id}`, isChecked);
      e.target.nextElementSibling.classList.toggle("item-done", isChecked);
      if (isChecked) {
        const itemData = findItemDataById(id);
        const group = e.target.closest(".accordion-item");
        const groupTitle =
          group.querySelector(".group-check").dataset.groupTitle;
        if (itemData) {
          gtag("event", "complete_todo_item", {
            item_id: itemData.ID,
            item_title: itemData.Title,
            group_title: groupTitle,
            user_id: userID,
          });
        }
      }
      if (isChecked) {
        const groupId = e.target
          .closest(".accordion-item")
          .querySelector(".group-check").dataset.groupId;
        reportGroupActivity(groupId);
      }
      const groupItem = e.target.closest(".accordion-item");
      const groupCheck = groupItem.querySelector(".group-check");
      const groupTitleSpan = groupCheck.nextElementSibling;
      const allItemChecks = groupItem.querySelectorAll(".item-check");
      const isAllChecked = Array.from(allItemChecks).every((c) => c.checked);
      groupCheck.checked = isAllChecked;
      groupTitleSpan.classList.toggle("item-done", isAllChecked);
    });
  });

  document.querySelectorAll(".group-check").forEach((groupCheckbox) => {
    groupCheckbox.addEventListener("change", (e) => {
      const groupId = e.target.dataset.groupId;
      const isChecked = e.target.checked;
      const groupItem = e.target.closest(".accordion-item");
      localStorage.setItem(`group_checklist_${groupId}`, isChecked);
      e.target.nextElementSibling.classList.toggle("item-done", isChecked);
      if (isChecked) {
        gtag("event", "complete_todo_group", {
          group_id: e.target.dataset.groupId,
          group_title: e.target.dataset.groupTitle,
          user_id: userID,
        });
      }
      if (isChecked) {
        reportGroupActivity(groupId);
      }
      groupItem.querySelectorAll(".item-check").forEach((itemCheckbox) => {
        if (itemCheckbox.checked !== isChecked) {
          itemCheckbox.checked = isChecked;
          itemCheckbox.dispatchEvent(new Event("change"));
        }
      });
    });
  });

  document.querySelectorAll(".tip-button, .reward-button").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = e.currentTarget.dataset.id;
      const isTip = e.currentTarget.classList.contains("tip-button");
      const data = findItemDataById(id);
      if (data) {
        gtag("event", "view_task_details", {
          detail_type: isTip ? "tip" : "reward",
          item_id: id,
          user_id: userID,
        });
        openDetailsModal(data, isTip);
      }
    });
  });
}

export function initializeAllEventListeners() {
  const userID = getUserID();

  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");
  const todolistOverlay = document.getElementById("todolist-overlay");
  const todolistPanel = document.getElementById("todolist-panel");
  const openTodolistButton = document.getElementById("open-todolist-button");
  const closeTodolistButton = document.getElementById("close-todolist-button");
  const closeDetailsModalButton = document.getElementById(
    "close-details-modal-button"
  );
  const detailsModalOverlay = document.getElementById("details-modal-overlay");
  const musicWaveLink = document.getElementById("music-wave-link");
  // ▼▼▼ 툴팁 관련 코드 추가 ▼▼▼
  const todoTooltipButton = document.getElementById("todo-tooltip-button");
  const todoTooltipBubble = document.getElementById("todo-tooltip-bubble");

  if (todoTooltipButton && todoTooltipBubble) {
    todoTooltipButton.addEventListener("click", (e) => {
      // 오버레이 클릭으로 바로 닫히는 것을 방지
      e.stopPropagation();
      todoTooltipBubble.classList.toggle("hidden");
    });
  }
  // ▲▲▲ 툴팁 관련 코드 끝 ▲▲▲

  const openTodolist = () => {
    gtag("event", "open_todo_list", { user_id: userID });
    todolistOverlay.classList.remove("hidden");
    todolistPanel.classList.remove("hidden");
  };
  const closeTodolist = () => {
    todolistOverlay.classList.add("hidden");
    todolistPanel.classList.add("hidden");
    // ▼▼▼ 툴팁 닫기 코드 추가 ▼▼▼
    if (todoTooltipBubble) {
      todoTooltipBubble.classList.add("hidden");
    }
    // ▲▲▲ 툴팁 닫기 코드 끝 ▲▲▲
  };

  if (openTodolistButton)
    openTodolistButton.addEventListener("click", openTodolist);
  if (closeTodolistButton)
    closeTodolistButton.addEventListener("click", closeTodolist);
  if (todolistOverlay) todolistOverlay.addEventListener("click", closeTodolist);

  if (closeDetailsModalButton)
    closeDetailsModalButton.addEventListener("click", closeDetailsModal);
  if (detailsModalOverlay)
    detailsModalOverlay.addEventListener("click", closeDetailsModal);

  if (tabButtons) {
    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        tabButtons.forEach((btn) => btn.classList.remove("active"));
        tabContents.forEach((content) => content.classList.add("hidden"));
        button.classList.add("active");
        const activeContent = document.querySelector(
          `[data-content="${button.dataset.tab}"]`
        );
        if (activeContent) activeContent.classList.remove("hidden");
      });
    });
  }

  document.querySelectorAll(".playlist-link").forEach((link) => {
    link.addEventListener("click", () => {
      gtag("event", "click_playlist_link", {
        platform: link.dataset.platform,
        device: link.dataset.device,
        user_id: userID,
      });
    });
  });

  if (musicWaveLink) {
    musicWaveLink.addEventListener("click", () => {
      gtag("event", "click_music_wave", { user_id: userID });
    });
  }
}

async function reportGroupActivity(groupId) {
  const key = "reported_" + groupId;

  // 1. 이미 오늘 보고했으면 종료
  if (localStorage.getItem(key)) return;

  // 2. [추가] 현재 이 그룹에 대한 보고가 "진행 중"이면 종료
  if (reporting.has(groupId)) return;

  try {
    // 3. [추가] 진행 중 플래그 설정
    reporting.add(groupId);

    await fetch("/api/increment-group-count", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId }),
    });

    // 4. [수정] 성공 여부와 관계없이, "오늘 시도함" 플래그를 저장
    // (기존 로직에서는 fetch 실패 시 저장이 안 되는 문제가 있었음)
    localStorage.setItem(key, "1");
  } catch (err) {
    console.error("Group activity report failed:", err);
    // 5. [수정] 오류가 발생해도 localStorage 에는 저장해서
    // 오늘 다시 시도하지 않도록 함
    localStorage.setItem(key, "1");
  } finally {
    // 6. [추가] 진행 중 플래그 해제
    reporting.delete(groupId);
  }
}
