import { schedule, allTodoData } from "./state.js";
import { formatKoreanTime, formatTimeMMSS, formatBold } from "./utils.js";
import {
  START_AT_MS,
  CUTOVER_AT_MS,
  PER_CYCLE_OLD,
  PER_CYCLE_NEW,
  BASE_COUNTS,
  TARGETS,
} from "./config.js";
import { addTodoEventListeners } from "./events.js";

export function renderPlaylist() {
  const ul = document.getElementById("playlist");
  if (!ul || schedule.length === 0) return;
  ul.innerHTML = schedule
    .map(
      (item, i) => `
<li data-index="${i}" class="flex flex-col p-2 rounded-lg shadow w-full opacity-50 transition-all bg-white text-[13px]">
  <div class="flex items-center gap-2">
    <div class="w-10 h-10 flex-shrink-0 rounded overflow-hidden">
      <img src="${item.cover}" alt="${
        item.title
      }" class="w-full h-full object-cover" 
         style="aspect-ratio: 1 / 1; background-color: #f0f0f0;"
         loading="lazy" decoding="async" />
    </div>
    <div class="flex-1">
      <p class="font-medium truncate">${i + 1}. ${item.title}</p>
      <p class="text-xs text-gray-500">${formatKoreanTime(
        item.start
      )} ~ ${formatKoreanTime(item.end)}</p>
    </div>
  </div>
  <div class="flex items-center gap-1 text-[11px] px-1 mt-1">
    <span id="start-${i}" class="w-[40px] text-left text-gray-400">+0:00</span>
    <div class="flex-1 h-1 bg-gray-200 rounded overflow-hidden">
      <div id="p-${i}" class="h-full bg-blue-400 transition-all" style="width:0%"></div>
    </div>
    <span id="end-${i}" class="w-[40px] text-right text-gray-400">-0:00</span>
  </div>
</li>`
    )
    .join("");
}

function tick() {
  const now = new Date();
  const diffSec = Math.max(0, Math.floor((Date.now() - START_AT_MS) / 1000));
  const cycles = Math.floor(diffSec / 3600);
  const secInLoop = diffSec % 3600;
  updateHighlight(secInLoop);
  updateCounts(cycles, secInLoop);
  updateProgress(secInLoop);
}

export function initializeStreamingUI() {
  renderPlaylist();
  tick();
  setInterval(tick, 1000);
}

function updateHighlight(secInLoop) {
  if (schedule.length === 0) return;
  const idx = schedule.findIndex(
    (item) => secInLoop >= item.startSec && secInLoop < item.endSec
  );
  document.querySelectorAll("#playlist li").forEach((li) => {
    const i = Number(li.dataset.index);
    const startEl = document.getElementById(`start-${i}`);
    const endEl = document.getElementById(`end-${i}`);
    if (i === idx) {
      li.classList.remove("opacity-50");
      li.classList.add("opacity-100", "playing");
      startEl.classList.remove("text-gray-400");
      endEl.classList.remove("text-gray-400");
      startEl.classList.add("text-blue-600");
      endEl.classList.add("text-blue-600");
    } else {
      li.classList.add("opacity-50");
      li.classList.remove("opacity-100", "playing");
      startEl.classList.add("text-gray-400");
      endEl.classList.add("text-gray-400");
      startEl.classList.remove("text-blue-600");
      endEl.classList.remove("text-blue-600");
    }
  });
}

function updateProgress(secInLoop) {
  if (schedule.length === 0) return;
  schedule.forEach((item, i) => {
    const bar = document.getElementById(`p-${i}`);
    const startEl = document.getElementById(`start-${i}`);
    const endEl = document.getElementById(`end-${i}`);
    if (!bar || !startEl || !endEl) return;
    const total = item.endSec - item.startSec;
    const passed = secInLoop - item.startSec;
    const remain = item.endSec - secInLoop;
    if (secInLoop >= item.startSec && secInLoop < item.endSec) {
      const pct = (passed / total) * 100;
      bar.style.width = `${pct}%`;
      startEl.textContent = `+${formatTimeMMSS(passed)}`;
      endEl.textContent = `-${formatTimeMMSS(remain)}`;
    } else {
      bar.style.width = "0%";
      startEl.textContent = `+0:00`;
      endEl.textContent = `-0:00`;
    }
  });
}

export function renderTodoList(data) {
  const container = document.getElementById("todolist-container");
  if (!container || !data) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const visibleItems = data.filter((item) => {
    if (!item.ID || !item.GroupID) return false;
    if (!item.StartDate && !item.EndDate) return true;

    const startDateParts = item.StartDate ? item.StartDate.split("-") : null;
    const startDate = startDateParts
      ? new Date(startDateParts[0], startDateParts[1] - 1, startDateParts[2])
      : null;

    const endDate = item.EndDate ? new Date(item.EndDate) : null;

    if (startDate && today < startDate) return false;
    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
      if (today > endDate) return false;
    }
    return true;
  });

  const rawGrouped = visibleItems.reduce((acc, item) => {
    (acc[item.GroupID] = acc[item.GroupID] || []).push(item);
    return acc;
  }, {});

  const structuredGroups = Object.keys(rawGrouped)
    .map((groupId) => {
      const items = rawGrouped[groupId];
      const mainItem = items.find((item) => item.GroupTitle) || items[0];
      const collectHeader = items.find(
        (item) => item.ID && item.ID.includes("_collect") && !item.ParentID
      );
      const collectSubItems = collectHeader
        ? items.filter((item) => item.ParentID === collectHeader.ID)
        : [];
      const voteTasks = items.filter(
        (item) => !item.ParentID && !item.ID.includes("_collect")
      );
      return {
        id: groupId,
        title: mainItem.GroupTitle,
        isEssential: items.some((item) => item.IsEssential === "TRUE"),
        collectHeader,
        collectSubItems,
        voteTasks,
      };
    })
    .filter((group) => group.title);

  let html = "";
  for (const group of structuredGroups) {
    const actualTodoItems = [
      ...group.collectSubItems,
      ...group.voteTasks,
    ].filter((item) => !item.ID.includes("_celebrate"));
    let isAllChecked =
      actualTodoItems.length > 0
        ? actualTodoItems.every(
            (item) => localStorage.getItem(`checklist_${item.ID}`) === "true"
          )
        : localStorage.getItem(`group_checklist_${group.id}`) === "true";

    html += `
      <div class="accordion-item bg-gray-50 rounded-lg overflow-hidden">
          <div class="accordion-header w-full flex justify-between items-center p-3 text-left cursor-pointer">
              <div class="flex items-center flex-grow min-w-0">
                  <input type="checkbox" data-group-id="${
                    group.id
                  }" data-group-title="${
      group.title
    }" class="group-check mr-3 h-5 w-5 flex-shrink-0" ${
      isAllChecked ? "checked" : ""
    }>
                  <span class="font-bold flex items-center flex-grow ${
                    isAllChecked ? "item-done" : ""
                  }">
                      ${
                        group.isEssential
                          ? '<span class="mr-2 text-red-500">🔴</span>'
                          : ""
                      }
                      <span class="truncate">${group.title}</span>
                  </span>
                  <span class="group-count ml-2" data-group-id="${
                    group.id
                  }">👥0</span>

              </div>
              <span class="accordion-arrow flex-shrink-0 ml-2 text-xl text-gray-400 transform transition-transform duration-300">▼</span>
          </div>
          <div class="accordion-content">
              <div class="px-3 pb-3 space-y-3">`;
    if (group.collectHeader) {
      html += `
          <div class="collect-section pt-2">
              <div class="flex justify-between items-center mb-2">
                  <h4 class="font-semibold text-gray-700">${
                    group.collectHeader.Title
                  }</h4>
                  <div class="action-buttons">${generateTipButton(
                    group.collectHeader
                  )}</div>
              </div>
              <ul class="space-y-2 pl-1">
                  ${group.collectSubItems
                    .map((item) => generateChecklistItem(item, true))
                    .join("")}
              </ul>
          </div>`;
    }
    if (group.collectHeader && group.voteTasks.length > 0) {
      html += `<hr class="my-3">`;
    }
    if (group.voteTasks.length > 0) {
      html += `
          <div class="vote-section">
              <ul class="space-y-3">
                  ${group.voteTasks
                    .map((item) => generateChecklistItem(item, false))
                    .join("")}
              </ul>
          </div>`;
    }
    html += `</div></div></div>`;
  }
  container.innerHTML = html;
  addTodoEventListeners();
  applyGroupCounts();
}

function generateChecklistItem(item, isSubItem) {
  const isEssential = item.IsEssential === "TRUE";
  const savedState = localStorage.getItem(`checklist_${item.ID}`) === "true";
  const title = item.Title;

  if (item.ID.includes("_celebrate")) {
    return `
      <li class="celebration-item flex justify-between items-center p-3 rounded-lg shadow-sm">
        <div class="flex items-center flex-grow min-w-0">
          <span class="font-bold text-black">${
            formatBold(title.replace(/\n/g, "<br>")) || ""
          }</span>
        </div>
        <div class="action-buttons flex-shrink-0 ml-2">
          ${generateRewardButton(item)}
          ${generateTipButton(item)}
          ${generateAppLinkButton(item)}
        </div>
      </li>`;
  }
  return `
      <li class="flex justify-between items-center ${
        isSubItem ? "text-sm" : "p-3 bg-white rounded-lg shadow-sm"
      }">
          <div class="flex items-center flex-grow min-w-0">
              <input type="checkbox" id="check_${item.ID}" data-id="${
    item.ID
  }" class="item-check mr-3 h-5 w-5 flex-shrink-0" ${
    savedState ? "checked" : ""
  }>
              <label for="check_${item.ID}" class="flex-grow cursor-pointer ${
    savedState ? "item-done" : ""
  } ${isEssential && !isSubItem ? "is-essential" : ""}">
                  ${formatBold(title.replace(/\n/g, "<br>")) || ""}
              </label>
          </div>
          <div class="action-buttons flex-shrink-0 ml-2">
              ${generateRewardButton(item)}
              ${generateTipButton(item)}
              ${generateAppLinkButton(item)}
          </div>
      </li>`;
}

const generateAppLinkButton = (item) =>
  item.AppLink
    ? `<a href="${item.AppLink}" target="_blank" class="link-button">&#128279;</a>`
    : "";
const generateRewardButton = (item) =>
  item.RewardImage1
    ? `<button class="reward-button" data-id="${item.ID}">🏆</button>`
    : "";
const generateTipButton = (item) =>
  item.TipImage1 || item.TipText1
    ? `<button class="tip-button" data-id="${item.ID}">❓</button>`
    : "";

export function openDetailsModal(itemData, isTip) {
  const overlay = document.getElementById("details-modal-overlay");
  const panel = document.getElementById("details-modal-panel");
  const titleEl = document.getElementById("details-modal-title");
  const contentEl = document.getElementById("details-modal-content");
  titleEl.textContent = isTip ? "💡 Tip" : "🏆 Reward";
  let contentHtml = "";
  let tips = [];
  if (isTip) {
    for (let i = 1; i <= 6; i++) {
      if (itemData[`TipImage${i}`] || itemData[`TipText${i}`]) {
        tips.push({
          img: itemData[`TipImage${i}`],
          text: itemData[`TipText${i}`],
        });
      }
    }
    contentHtml = `
      <div class="carousel-container relative">
        <div class="carousel-items">
          ${tips
            .map(
              (tip, index) => `
            <div class="carousel-item ${
              index === 0 ? "active" : ""
            }" data-index="${index}">
              ${
                tip.img
                  ? `<img src="${tip.img}" alt="Tip image ${index + 1}">`
                  : ""
              }
              ${
                tip.text
                  ? `<p>${formatBold(tip.text.replace(/\\n/g, "<br>"))}</p>`
                  : ""
              }
            </div>`
            )
            .join("")}
        </div>
        ${
          tips.length > 1
            ? `
            <div class="carousel-navigation">
                <button class="carousel-prev">&lt;</button>
                <button class="carousel-next">&gt;</button>
            </div>
            <div class="carousel-dots">
                ${tips
                  .map(
                    (_, index) =>
                      `<button class="carousel-dot ${
                        index === 0 ? "active" : ""
                      }" data-index="${index}"></button>`
                  )
                  .join("")}
            </div>`
            : ""
        }
      </div>`;
  } else {
    contentHtml = `
      ${
        itemData.RewardImage1
          ? `<img src="${itemData.RewardImage1}" alt="Reward image" class="mx-auto mb-3 max-w-full max-h-48 object-contain">`
          : ""
      }
      <p class="whitespace-pre-wrap word-break-keep-all">${formatBold(
        itemData.RewardText1.replace(/\\n/g, "<br>")
      )}</p>`;
  }
  contentEl.innerHTML = contentHtml;
  overlay.classList.remove("hidden");
  panel.classList.remove("hidden");
  if (isTip && tips.length > 1) {
    addCarouselEventListeners();
  }
}

function addCarouselEventListeners() {
  const container = document.querySelector(".carousel-container");
  if (!container) return;
  const items = container.querySelectorAll(".carousel-item");
  const dots = container.querySelectorAll(".carousel-dot");
  const nextBtn = container.querySelector(".carousel-next");
  const prevBtn = container.querySelector(".carousel-prev");
  if (items.length <= 1) return;
  let currentIndex = 0;
  function updateCarousel() {
    items.forEach((item, i) =>
      item.classList.toggle("active", i === currentIndex)
    );
    dots.forEach((dot, i) =>
      dot.classList.toggle("active", i === currentIndex)
    );
  }
  if (nextBtn)
    nextBtn.addEventListener("click", () => {
      currentIndex = (currentIndex + 1) % items.length;
      updateCarousel();
    });
  if (prevBtn)
    prevBtn.addEventListener("click", () => {
      currentIndex = (currentIndex - 1 + items.length) % items.length;
      updateCarousel();
    });
  dots.forEach((dot) => {
    dot.addEventListener("click", (e) => {
      currentIndex = parseInt(e.target.dataset.index);
      updateCarousel();
    });
  });
}

export function closeDetailsModal() {
  document.getElementById("details-modal-overlay").classList.add("hidden");
  document.getElementById("details-modal-panel").classList.add("hidden");
}

// -----------------------------------------------------------------
// ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 아래 함수들을 추가합니다 ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
// -----------------------------------------------------------------

/**
 * [최종 수정] 공지사항 목록을 '페이지네이션' 기능이 포함된 아코디언 방식으로 렌더링하는 함수
 */
export function renderNoticeList(noticeData, currentPage = 1) {
  const container = document.getElementById("notice-list-container");
  const paginationContainer = document.getElementById(
    "notice-pagination-container"
  );
  if (!container || !paginationContainer || !noticeData) return;

  const itemsPerPage = 3; // 한 페이지에 3개씩 표시
  const sortedNotices = noticeData.sort((a, b) => b.ID - a.ID);

  // 현재 페이지에 해당하는 데이터만 잘라내기
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNotices = sortedNotices.slice(startIndex, endIndex);

  // 1. 공지사항 목록 표시 (3개)
  container.innerHTML = paginatedNotices
    .map(
      (notice) => `
      <details class="bg-white rounded-lg shadow-sm overflow-hidden border">
          <summary class="p-4 cursor-pointer flex justify-between items-center">
              <div class="flex items-center">
                  <span class="font-semibold text-gray-800">${
                    notice.Title
                  }</span>
                  ${
                    notice.New === "TRUE"
                      ? '<span class="ml-2 text-xs bg-red-500 text-white font-bold px-2 py-0.5 rounded-full">N</span>'
                      : ""
                  }
              </div>
              <div class="text-sm text-gray-500">${notice.Date}</div>
          </summary>
          <div class="p-4 border-t border-gray-200 bg-gray-50">
              <p class="text-gray-700 whitespace-pre-wrap">${notice.Content.replace(
                /\\n/g,
                "\n"
              )}</p>
          </div>
      </details>
  `
    )
    .join("");

  // 2. 페이지네이션 버튼 생성
  const totalPages = Math.ceil(sortedNotices.length / itemsPerPage);
  paginationContainer.innerHTML = ""; // 기존 버튼 초기화

  if (totalPages > 1) {
    for (let i = 1; i <= totalPages; i++) {
      const pageButton = document.createElement("button");
      pageButton.textContent = i;
      pageButton.className = `px-3 py-1 rounded-md text-sm font-medium ${
        i === currentPage
          ? "bg-blue-500 text-white"
          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
      }`;
      pageButton.onclick = () => renderNoticeList(noticeData, i);
      paginationContainer.appendChild(pageButton);
    }
  }
}

/**
 * [신규] 새로운 공지사항이 있는지 확인하고 알림 아이콘을 표시하는 함수
 */
export function checkNewNotices(noticeData) {
  if (!noticeData || noticeData.length === 0) return;

  const lastCheckedId = parseInt(
    localStorage.getItem("lastCheckedNoticeId") || "0",
    10
  );
  const latestId = Math.max(...noticeData.map((n) => parseInt(n.ID, 10)));

  const noticeDot = document.getElementById("notice-dot");
  if (noticeDot) {
    if (latestId > lastCheckedId) {
      noticeDot.classList.remove("hidden");
    } else {
      noticeDot.classList.add("hidden");
    }
  }

  const noticeLink = document.getElementById("notice-link");
  if (noticeLink) {
    noticeLink.addEventListener("click", () => {
      localStorage.setItem("lastCheckedNoticeId", latestId);
      if (noticeDot) noticeDot.classList.add("hidden");
    });
  }
}

async function applyGroupCounts() {
  try {
    const counts = await fetch("/api/get-group-counts").then((r) => r.json());
    document.querySelectorAll(".group-count").forEach((el) => {
      const id = el.dataset.groupId;
      const num = counts[id] || 0;
      el.textContent = `👥${num}`;
    });
  } catch (err) {
    console.error("그룹 카운트 불러오기 실패:", err);
  }
}
