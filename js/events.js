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

/**
 * 알림 설정을 서버에 저장하는 함수
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
 * 알림 시스템 전체를 초기화하고 이벤트 리스너를 설정하는 함수 (통합 버전)
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
          alarmOptIn: alarmToggle.checked, // 통합된 값 전송
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
          const { alarmOptIn = false } = await res.json(); // 통합된 값 수신
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

// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
// 추가/수정 끝
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

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
  const tweetBtn = document.getElementById("tweet-button");
  const cheerInput = document.getElementById("cheer-message");

  const openTodolist = () => {
    gtag("event", "open_todo_list", { user_id: userID });
    todolistOverlay.classList.remove("hidden");
    todolistPanel.classList.remove("hidden");
  };
  const closeTodolist = () => {
    todolistOverlay.classList.add("hidden");
    todolistPanel.classList.add("hidden");
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

  if (tweetBtn && cheerInput) {
    tweetBtn.addEventListener("click", () => {
      const message = cheerInput.value.trim();
      if (!message) return alert("응원 멘트를 입력해주세요!");
      gtag("event", "share_event_tweet", {
        event_category: "Event",
        event_label: message,
        user_id: userID,
      });
      const header = "🔥 PLLI 스밍/투표 독려 이벤트 🔥";
      const eventInfo =
        "📅 기간: 7/21(월) ~ 8/4(월) 23:59\n🎁 상품: 8/5 추첨! 덕질 자금 1만원 (1명)\n💗 많이 공유할수록 당첨 확률 UP! UP!\n\n👇 로그인 필요없이 앱 하단에서 바로 참여 가능!";
      const tags = "#PLLI_스밍투표_이벤트 #PLLI_화력응원 #PLAVE";
      const url = "https://www.plli-checker.app";
      const tweetText = encodeURIComponent(
        `${header}\n\n${message}\n\n${eventInfo}\n${tags}\n\n${url}`
      );
      window.open(
        `https://twitter.com/intent/tweet?text=${tweetText}`,
        "_blank"
      );
    });
  }

  // ▼▼▼▼▼ 슈퍼팬 관련 로직 (이 부분을 통째로 교체해주세요) ▼▼▼▼▼
  const clickCountSpan = document.getElementById("superfan-click-count");
  let clickCount = parseInt(localStorage.getItem("superfanClickCount") || "0");
  let clickedLinks = JSON.parse(
    localStorage.getItem("superfanClickedLinks") || "[]"
  );

  const helpBtn = document.getElementById("help-superfan-btn");
  const registerBtn = document.getElementById("register-superfan-link-btn");
  const modalOverlay = document.getElementById("superfan-modal-overlay");
  const modalPanel = document.getElementById("superfan-modal-panel");
  const closeModalBtn = document.getElementById("close-superfan-modal-btn");
  const submitBtn = document.getElementById("submit-superfan-link-btn");
  const urlInput = document.getElementById("superfan-url-input");
  const feedback = document.getElementById("superfan-feedback");

  // 페이지 로드 시 클릭 횟수 표시
  if (clickCountSpan) clickCountSpan.textContent = clickCount;

  // 모달 열고 닫기
  function openModal() {
    modalOverlay.classList.remove("hidden");
    modalPanel.classList.remove("hidden");
    feedback.textContent = "";
    urlInput.value = "";
  }
  function closeModal() {
    modalOverlay.classList.add("hidden");
    modalPanel.classList.add("hidden");
  }
  if (registerBtn) registerBtn.addEventListener("click", openModal);
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
  if (modalOverlay) modalOverlay.addEventListener("click", closeModal);

  // 링크 등록 로직
  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      const url = urlInput.value.trim();
      if (!url) {
        feedback.textContent = "🔗 링크를 입력해주세요.";
        feedback.className = "text-xs pt-1 text-red-500 text-center";
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = "등록 중...";
      try {
        const res = await fetch("/api/superfan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);

        // [개선] 새 링크 등록 시, 로컬 캐시에도 바로 추가
        const cachedLinks = JSON.parse(
          sessionStorage.getItem("superfanLinks") || "[]"
        );
        if (!cachedLinks.includes(url)) {
          cachedLinks.push(url);
          sessionStorage.setItem("superfanLinks", JSON.stringify(cachedLinks));
        }

        feedback.textContent = "✅ 등록 완료!";
        feedback.className = "text-xs pt-1 text-green-600 text-center";
        setTimeout(closeModal, 1200);
      } catch (err) {
        feedback.textContent = `❌ ${err.message}`;
        feedback.className = "text-xs pt-1 text-red-500 text-center";
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "등록하기";
      }
    });
  }

  // 도와주기 버튼 로직
  if (helpBtn) {
    helpBtn.addEventListener("click", async () => {
      helpBtn.disabled = true; // 중복 클릭 방지
      try {
        // 1. 우선 로컬 캐시에서 링크 목록 가져오기
        let allLinks = JSON.parse(
          sessionStorage.getItem("superfanLinks") || "[]"
        );
        let unclicked = allLinks.filter((l) => !clickedLinks.includes(l));

        // 2. 만약 안 누른 링크가 없다면, 서버에 새로 요청해서 목록 갱신
        if (unclicked.length === 0) {
          const res = await fetch("/api/superfan");
          if (!res.ok) throw new Error("링크 목록을 새로고침하지 못했어요.");

          allLinks = await res.json();
          sessionStorage.setItem("superfanLinks", JSON.stringify(allLinks)); // 캐시 갱신
          unclicked = allLinks.filter((l) => !clickedLinks.includes(l));
        }

        // 3. 갱신 후에도 안 누른 링크가 없다면, 최종 메시지 표시
        if (unclicked.length === 0) {
          alert(
            "모든 링크를 다 누르셨어요! 🎉 새로운 링크가 등록되면 다시 도와주세요."
          );
          return;
        }

        // 4. 안 누른 링크가 있다면, 랜덤으로 하나 열기
        const next = unclicked[Math.floor(Math.random() * unclicked.length)];
        window.open(next, "_blank");

        clickedLinks.push(next);
        localStorage.setItem(
          "superfanClickedLinks",
          JSON.stringify(clickedLinks)
        );
        clickCount++;
        localStorage.setItem("superfanClickCount", clickCount);
        if (clickCountSpan) clickCountSpan.textContent = clickCount;
      } catch (err) {
        alert(`에러: ${err.message}`);
      } finally {
        helpBtn.disabled = false; // 버튼 다시 활성화
      }
    });
  }
  // ▲▲▲▲▲ 슈퍼팬 관련 로직 끝 ▲▲▲▲▲
}
