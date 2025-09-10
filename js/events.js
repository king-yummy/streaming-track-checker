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

// ▼▼▼▼▼ [신규] 브라우저에 알림 권한을 요청하는 함수 ▼▼▼▼▼
/**
 * 브라우저에 알림 권한을 명시적으로 요청하고 서버에 토큰을 저장합니다.
 * @returns {Promise<string|null>} 성공 시 FCM 토큰, 실패 시 null 반환
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
// ▲▲▲▲▲ 여기까지 추가 ▲▲▲▲▲

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

  // ▼▼▼▼▼ 슈퍼팬 관련 로직 (GA 태그 추가됨) ▼▼▼▼▼
  const clickCountSpan = document.getElementById("superfan-click-count");
  const boosterCountSpan = document.getElementById("booster-count");
  const participantCountSpan = document.getElementById("participant-count");

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

  if (clickCountSpan) clickCountSpan.textContent = clickCount;

  // 서버에서 전체 통계 데이터 가져와서 화면 업데이트
  async function updateSuperfanStats() {
    try {
      const res = await fetch("/api/superfan-stats");
      if (res.ok) {
        const { participants, boosterCount } = await res.json();
        if (participantCountSpan)
          participantCountSpan.textContent = `${participants}명 참여 중!`;
        if (boosterCountSpan)
          boosterCountSpan.textContent = `플리 부스터 ${boosterCount}회`;
      }
    } catch (error) {
      console.error("슈퍼팬 통계 로딩 실패:", error);
    }
  }
  updateSuperfanStats(); // 페이지 로드 시 최초 실행

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

  if (registerBtn) {
    registerBtn.addEventListener("click", () => {
      const currentClickCount = parseInt(
        localStorage.getItem("superfanClickCount") || "0"
      );
      gtag("event", "click_register_superfan_link_button", {
        user_id: userID,
        current_click_count: currentClickCount,
      });
      if (currentClickCount < 2000) {
        alert(
          `품앗이 링크를 2000회 이상 클릭해야 내 링크를 등록할 수 있습니다.\n\n현재 클릭 수: ${currentClickCount}회`
        );
        return;
      }
      openModal();
    });
  }

  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
  if (modalOverlay) modalOverlay.addEventListener("click", closeModal);

  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      const url = urlInput.value.trim();
      const currentClickCount = parseInt(
        localStorage.getItem("superfanClickCount") || "0"
      );

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
          body: JSON.stringify({ url, clickCount: currentClickCount }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);

        const cachedLinks = JSON.parse(
          sessionStorage.getItem("superfanLinks") || "[]"
        );
        if (!cachedLinks.includes(url)) {
          cachedLinks.push(url);
          sessionStorage.setItem("superfanLinks", JSON.stringify(cachedLinks));
        }

        feedback.textContent = "✅ 등록 완료!";
        feedback.className = "text-xs pt-1 text-green-600 text-center";
        gtag("event", "superfan_link_submission_success", {
          user_id: userID,
          submitted_url: url,
        });
        setTimeout(closeModal, 1200);
      } catch (err) {
        feedback.textContent = `❌ ${err.message}`;
        feedback.className = "text-xs pt-1 text-red-500 text-center";
        gtag("event", "superfan_link_submission_failed", {
          user_id: userID,
          error_message: err.message,
        });
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "등록하기";
      }
    });
  }

  if (helpBtn) {
    helpBtn.addEventListener("click", async (event) => {
      // 새 탭에서 열기(Ctrl+Click, Cmd+Click, 마우스 휠 클릭)가 아니면 기본 동작을 막습니다.
      if (!event.ctrlKey && !event.metaKey && event.button !== 1) {
        event.preventDefault();
      }

      helpBtn.disabled = true;
      gtag("event", "click_help_superfan_button", {
        user_id: userID,
        current_click_count: clickCount,
      });

      try {
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (token) {
          const res = await fetch("/api/superfan-stats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          if (res.ok) {
            updateSuperfanStats();
          }
        }
      } catch (err) {
        console.error("FCM 토큰 가져오기 또는 부스터 기록 실패:", err);
      }

      try {
        let allLinks = JSON.parse(
          sessionStorage.getItem("superfanLinks") || "[]"
        );
        let unclicked = allLinks.filter((l) => !clickedLinks.includes(l));

        if (unclicked.length === 0) {
          clickedLinks = [];
          localStorage.setItem("superfanClickedLinks", "[]");
          helpBtn.textContent = "리스트 갱신중..";
          const res = await fetch("/api/superfan");
          if (!res.ok) throw new Error("링크 목록을 새로고침하지 못했어요.");
          allLinks = await res.json();
          sessionStorage.setItem("superfanLinks", JSON.stringify(allLinks));
          unclicked = allLinks;
          alert(
            "모든 링크를 다 눌렀어요! 리스트를 갱신했으니 다시 시작해주세요! 🎉"
          );
          helpBtn.innerHTML = `링크 클릭 <span id="superfan-click-count">${clickCount}</span>회`;
          return;
        }

        const next = unclicked[Math.floor(Math.random() * unclicked.length)];

        // [수정] 링크를 여는 방식 변경
        const tempLink = document.createElement("a");
        tempLink.href = next;
        tempLink.target = "_blank";
        tempLink.rel = "noopener noreferrer";

        // 새 탭에서 열기(Ctrl+Click 등)가 아니면 직접 클릭 이벤트를 발생시킵니다.
        if (!event.ctrlKey && !event.metaKey && event.button !== 1) {
          document.body.appendChild(tempLink);
          tempLink.click();
          document.body.removeChild(tempLink);
        } else {
          // Ctrl+Click 등을 위해 가상의 링크를 만들어 클릭을 위임합니다.
          const clickEvent = new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window,
            ctrlKey: true, // 강제로 ctrlKey를 활성화하여 새 탭 동작 유도
          });
          tempLink.dispatchEvent(clickEvent);
        }

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
        helpBtn.disabled = false;
      }
    });
  }
  // ▲▲▲▲▲ 슈퍼팬 관련 로직 끝 ▲▲▲▲▲
}
