import { getUserID } from './utils.js';
import { openDetailsModal, closeDetailsModal } from './ui.js';
import { allTodoData } from './state.js';

const findItemDataById = (id) => allTodoData.find((item) => item.ID === id);

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

    const openGuideButton = document.getElementById("streaming-guide-button");
    const guideModalOverlay = document.getElementById("guide-modal-overlay");
    const guideModalPanel = document.getElementById("guide-modal-panel");
    const closeGuideButtonX = document.getElementById("close-guide-button-x");
    const closeGuideButtonMain = document.getElementById("close-guide-button-main");
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");
    const todolistOverlay = document.getElementById("todolist-overlay");
    const todolistPanel = document.getElementById("todolist-panel");
    const openTodolistButton = document.getElementById("open-todolist-button");
    const closeTodolistButton = document.getElementById("close-todolist-button");
    const closeDetailsModalButton = document.getElementById("close-details-modal-button");
    const detailsModalOverlay = document.getElementById("details-modal-overlay");
    const musicWaveLink = document.getElementById("music-wave-link");
    const tweetBtn = document.getElementById("tweet-button");
    const cheerInput = document.getElementById("cheer-message");

    const openGuideModal = () => {
        gtag("event", "view_streaming_guide", { user_id: userID });
        guideModalOverlay.classList.remove("hidden");
        guideModalPanel.classList.remove("hidden");
        guideModalPanel.classList.add("flex");
    };
    const closeGuideModal = () => {
        guideModalOverlay.classList.add("hidden");
        guideModalPanel.classList.add("hidden");
        guideModalPanel.classList.remove("flex");
    };

    const openTodolist = () => {
        gtag("event", "open_todo_list", { user_id: userID });
        todolistOverlay.classList.remove("hidden");
        todolistPanel.classList.remove("hidden");
    };
    const closeTodolist = () => {
        todolistOverlay.classList.add("hidden");
        todolistPanel.classList.add("hidden");
    };

    if (openGuideButton) openGuideButton.addEventListener("click", openGuideModal);
    if (closeGuideButtonX) closeGuideButtonX.addEventListener("click", closeGuideModal);
    if (closeGuideButtonMain) closeGuideButtonMain.addEventListener("click", closeGuideModal);
    if (guideModalOverlay) guideModalOverlay.addEventListener("click", closeGuideModal);

    if (openTodolistButton) openTodolistButton.addEventListener("click", openTodolist);
    if (closeTodolistButton) closeTodolistButton.addEventListener("click", closeTodolist);
    if (todolistOverlay) todolistOverlay.addEventListener("click", closeTodolist);

    if (closeDetailsModalButton) closeDetailsModalButton.addEventListener("click", closeDetailsModal);
    if (detailsModalOverlay) detailsModalOverlay.addEventListener("click", closeDetailsModal);

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
