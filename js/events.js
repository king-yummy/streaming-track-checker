import { getUserID } from "./utils.js";
import { openDetailsModal, closeDetailsModal } from "./ui.js";
import { allTodoData } from "./state.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getMessaging,
  getToken,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

const findItemDataById = (id) => allTodoData.find((item) => item.ID === id);

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
 * 알림 시스템 전체를 초기화하고 이벤트 리스너를 설정하는 함수
 */
export async function initializeNotificationSystem() {
  const bellBtn = document.getElementById("notification-bell-btn");
  const modalOverlay = document.getElementById(
    "pre-notification-modal-overlay"
  );
  const modalPanel = document.getElementById("pre-notification-modal-panel");
  const allowBtn = document.getElementById("pre-notification-allow-btn");
  const denyBtn = document.getElementById("pre-notification-deny-btn");

  if (!bellBtn || !modalPanel) return;

  // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
  // 서비스 워커가 준비될 때까지 기다리는 코드를 추가합니다.
  try {
    await navigator.serviceWorker.ready;
  } catch (error) {
    console.error("서비스 워커 준비 대기 중 오류:", error);
    // 서비스 워커를 사용할 수 없으면 알림 버튼을 숨깁니다.
    bellBtn.style.display = "none";
    return;
  }
  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

  const openModal = () => {
    modalOverlay.classList.remove("hidden");
    modalPanel.classList.remove("hidden");
  };
  const closeModal = () => {
    modalOverlay.classList.add("hidden");
    modalPanel.classList.add("hidden");
  };

  bellBtn.addEventListener("click", () => {
    if (Notification.permission === "denied") {
      alert(
        "알림이 차단되어 있습니다. 브라우저 설정에서 알림 권한을 직접 허용해주세요."
      );
      return;
    }
    openModal();
  });

  allowBtn.addEventListener("click", async () => {
    const noticeOptIn = document.getElementById("modal-notice-opt-in").checked;
    const calendarOptIn = document.getElementById(
      "modal-calendar-opt-in"
    ).checked;

    const permissionGranted = await requestPermissionAndGetToken(
      noticeOptIn,
      calendarOptIn
    );

    if (permissionGranted) {
      alert("알림이 성공적으로 설정되었습니다!");
    }
    closeModal();
  });

  denyBtn.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", closeModal);

  // 페이지 로드 시, 저장된 알림 설정을 불러오는 로직
  if (Notification.permission === "granted") {
    const token = await getToken(messaging, { vapidKey: "YOUR_VAPID_KEY" });
    if (token) {
      currentToken = token;
      // 서버에 현재 토큰의 설정값을 요청
      try {
        const response = await fetch(`/api/save-token?token=${token}`);
        const settings = await response.json();
        // 받아온 설정값으로 체크박스 상태 업데이트
        noticeCheck.checked = settings.noticeOptIn;
        calendarCheck.checked = settings.calendarOptIn;
        console.log("서버에서 알림 설정을 불러왔습니다:", settings);
      } catch (error) {
        console.error("알림 설정 불러오기 실패:", error);
      }
    }
  }
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
}
