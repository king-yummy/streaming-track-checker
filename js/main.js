// =================================================================
// ===============          기본 설정 및 변수 선언          ===============
// =================================================================

// --- Google Sheet URL ---
const STREAMING_LIST_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR7sUDMYoUsBpvEC9LjO25CnstexV74iKXfwRWVdqpQCOm65rzvJ6RrnedOv6JSqEYJNqyr2cje75CJ/pub?gid=0&single=true&output=csv";

const TODO_LIST_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR7sUDMYoUsBpvEC9LjO25CnstexV74iKXfwRWVdqpQCOm65rzvJ6RrnedOv6JSqEYJNqyr2cje75CJ/pub?gid=673035369&single=true&output=csv";

// --- 스밍 리스트 관련 변수 ---
const START_AT_MS = new Date("2025-06-16T00:00:00+09:00").getTime();
const TARGETS = {
  kakurenbo: "かくれんぼ",
  rizz: "Rizz - japanese Ver.",
  chroma: "Chroma Drift - japanese Ver.",
};
let schedule = [];
const CUTOVER_AT_MS = new Date("2025-07-06T23:00:00+09:00").getTime();
const PER_CYCLE_OLD = { kakurenbo: 4, rizz: 3, chroma: 1 };
const PER_CYCLE_NEW = { kakurenbo: 2, rizz: 1, chroma: 1 };
const OLD_SYSTEM_DURATION_SEC = Math.floor(
  (CUTOVER_AT_MS - START_AT_MS) / 1000
);
const OLD_SYSTEM_CYCLES = Math.floor(OLD_SYSTEM_DURATION_SEC / 3600);
const BASE_COUNTS = {
  kakurenbo: OLD_SYSTEM_CYCLES * PER_CYCLE_OLD.kakurenbo,
  rizz: OLD_SYSTEM_CYCLES * PER_CYCLE_OLD.rizz,
  chroma: OLD_SYSTEM_CYCLES * PER_CYCLE_OLD.chroma,
};

// =================================================================
// ===============        사용자 ID 관련 로직 (신규)        ===============
// =================================================================

// 사용자 고유 ID를 생성하고 관리하는 함수
function getUserID() {
  let userID = localStorage.getItem("plli_user_id");
  if (!userID) {
    // 간단한 고유 ID 생성 (UUID v4)
    userID = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0,
          v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
    localStorage.setItem("plli_user_id", userID);
  }
  return userID;
}

// =================================================================
// ===============        투두리스트 관련 로직 (신규)       ===============
// =================================================================

// --- 자정 투두리스트 초기화 로직 (신규 추가) ---
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

// --- 텍스트 포매팅 (신규) ---
// **text** -> <strong>text</strong> 변환
const formatBold = (text) => {
  if (!text) return "";
  return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
};

// --- 데이터 로드 및 파싱 ---
async function loadTodoListData() {
  try {
    const response = await fetch(TODO_LIST_URL);
    const text = await response.text();
    const rows = text
      .trim()
      .split(/\r?\n(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/)
      .slice(1);
    const headers = text
      .trim()
      .split("\n")[0]
      .split(",")
      .map((h) => h.trim());

    const data = rows.map((row) => {
      const values = row.split(/,(?=(?:(?:[^\"]*"){2})*[^\"]*$)/);
      const obj = {};
      headers.forEach((header, i) => {
        let value = (values[i] || "").trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1).replace(/""/g, '"');
        }
        obj[header] = value === "NULL" || value === "" ? null : value;
      });
      return obj;
    });

    renderTodoList(data);
  } catch (error) {
    console.error("투두리스트 데이터 로딩 실패:", error);
    const container = document.getElementById("todolist-container");
    if (container)
      container.innerHTML =
        '<p class="text-center text-red-500">데이터를 불러오는 데 실패했습니다.</p>';
  }
}

// --- UI 렌더링 ---
function renderTodoList(data) {
  const container = document.getElementById("todolist-container");
  if (!container) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const visibleItems = data.filter((item) => {
    if (!item.ID || !item.GroupID) return false;
    if (!item.StartDate && !item.EndDate) return true;

    // 타임존 문제 수정한 날짜 비교 로직
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

  // [수정된 부분 1] 삭제했던 그룹핑 로직을 되살리고, 모든 아이템(visibleItems)을 그룹핑합니다.
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

      // [수정된 부분 2] voteTasks에 celebrate 항목이 포함되도록 수정합니다.
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

  let html = ""; // 여기서부터 UI를 그리기 시작합니다.

  // 4. 기존 그룹(투표, 수집) 렌더링
  for (const group of structuredGroups) {
    // '할 일' 항목만 필터링 (celebrate 항목 제외)
    const actualTodoItems = [
      ...group.collectSubItems,
      ...group.voteTasks,
    ].filter((item) => !item.ID.includes("_celebrate"));

    let isAllChecked;
    if (actualTodoItems.length > 0) {
      // '할 일'이 있는 경우: 기존 로직 사용
      isAllChecked = actualTodoItems.every(
        (item) => localStorage.getItem(`checklist_${item.ID}`) === "true"
      );
    } else {
      // '할 일'이 없는 경우: 그룹 자체의 상태를 확인
      isAllChecked =
        localStorage.getItem(`group_checklist_${group.id}`) === "true";
    }

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
                    </div>
                    <span class="accordion-arrow flex-shrink-0 ml-2 text-xl text-gray-400 transform transition-transform duration-300">▼</span>
                </div>
                <div class="accordion-content">
                    <div class="px-3 pb-3 space-y-3">
        `;

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
                </div>
            `;
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
                </div>
            `;
    }
    html += `</div></div></div>`;
  }
  container.innerHTML = html;
  addTodoEventListeners();
}

// '달성 완료' 항목 UI 생성 함수 (신규)
function generateCelebrationItem(item) {
  const title = item.Title;
  return `
        <li class="celebration-item flex justify-between items-center p-3 rounded-lg shadow-sm">
            <div class="flex items-center flex-grow min-w-0">
                <span class="font-bold text-black">
                    ${formatBold(title.replace(/\n/g, "<br>")) || ""}
                </span>
            </div>
            <div class="action-buttons flex-shrink-0 ml-2">
                ${generateRewardButton(item)}
                ${generateTipButton(item)}
                ${generateAppLinkButton(item)}
            </div>
        </li>
    `;
}

function generateChecklistItem(item, isSubItem) {
  const isEssential = item.IsEssential === "TRUE";
  const savedState = localStorage.getItem(`checklist_${item.ID}`) === "true";
  const title = item.Title;

  // '달성 완료' 항목일 경우 (체크박스 없음)
  if (item.ID.includes("_celebrate")) {
    return `
      <li class="celebration-item flex justify-between items-center p-3 rounded-lg shadow-sm">
        <div class="flex items-center flex-grow min-w-0">
          <span class="font-bold text-black">
              ${formatBold(title.replace(/\n/g, "<br>")) || ""}
          </span>
        </div>
        <div class="action-buttons flex-shrink-0 ml-2">
          ${generateRewardButton(item)}
          ${generateTipButton(item)}
          ${generateAppLinkButton(item)}
        </div>
      </li>
    `;
  }

  // 일반 체크리스트 항목일 경우 (체크박스 있음)
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
      </li>
  `;
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

function addTodoEventListeners() {
  const userID = getUserID(); // 사용자 ID 가져오기

  // 아코디언 토글
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

  // 개별 아이템 체크박스
  document.querySelectorAll(".item-check").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      const isChecked = e.target.checked;
      localStorage.setItem(`checklist_${id}`, isChecked);
      e.target.nextElementSibling.classList.toggle("item-done", isChecked);

      // GA 이벤트: complete_todo_item
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

  // 그룹 전체 체크박스
  document.querySelectorAll(".group-check").forEach((groupCheckbox) => {
    groupCheckbox.addEventListener("change", (e) => {
      const groupId = e.target.dataset.groupId;
      const isChecked = e.target.checked;
      const groupItem = e.target.closest(".accordion-item");

      // 그룹 체크박스 상태를 localStorage에 저장
      localStorage.setItem(`group_checklist_${groupId}`, isChecked);

      e.target.nextElementSibling.classList.toggle("item-done", isChecked);

      // GA 이벤트: complete_todo_group
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

  // 팁/보상 버튼
  document.querySelectorAll(".tip-button, .reward-button").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = e.currentTarget.dataset.id;
      const isTip = e.currentTarget.classList.contains("tip-button");
      const data = findItemDataById(id);
      if (data) {
        // GA 이벤트: view_task_details
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

function openDetailsModal(itemData, isTip) {
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
                                ? `<img src="${tip.img}" alt="Tip image ${
                                    index + 1
                                  }">`
                                : ""
                            }
                            ${
                              tip.text
                                ? `<p>${formatBold(
                                    tip.text.replace(/\\n/g, "<br>")
                                  )}</p>`
                                : ""
                            }
                        </div>
                    `
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
                    </div>
                `
                    : ""
                }
            </div>
        `;
  } else {
    contentHtml = `
            ${
              itemData.RewardImage1
                ? `<img src="${itemData.RewardImage1}" alt="Reward image" class="mx-auto mb-3 max-w-full max-h-48 object-contain">`
                : ""
            }
            <p class="whitespace-pre-wrap word-break-keep-all">${formatBold(
              itemData.RewardText1.replace(/\\n/g, "<br>")
            )}</p>
        `;
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

function closeDetailsModal() {
  document.getElementById("details-modal-overlay").classList.add("hidden");
  document.getElementById("details-modal-panel").classList.add("hidden");
}

let allTodoData = [];
async function cacheTodoData() {
  try {
    const response = await fetch(TODO_LIST_URL);
    const text = await response.text();
    const rows = text
      .trim()
      .split(/\r?\n(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/)
      .slice(1);
    const headers = text
      .trim()
      .split("\n")[0]
      .split(",")
      .map((h) => h.trim());
    allTodoData = rows.map((row) => {
      const values = row.split(/,(?=(?:(?:[^\"]*"){2})*[^\"]*$)/);
      const obj = {};
      headers.forEach((header, i) => {
        let value = (values[i] || "").trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1).replace(/""/g, '"');
        }
        obj[header] = value === "NULL" || value === "" ? null : value;
      });
      return obj;
    });
  } catch (e) {
    console.error("투두리스트 데이터 캐싱 실패", e);
    allTodoData = [];
  }
}
const findItemDataById = (id) => allTodoData.find((item) => item.ID === id);

// =================================================================
// ===============          기존 스밍 리스트 로직         ===============
// =================================================================

function updateCounts(cycles, secInLoop) {
  const now = Date.now();
  let counts = {};

  if (now < CUTOVER_AT_MS) {
    counts = {
      kakurenbo: cycles * PER_CYCLE_OLD.kakurenbo,
      rizz: cycles * PER_CYCLE_OLD.rizz,
      chroma: cycles * PER_CYCLE_OLD.chroma,
    };

    schedule.forEach((item) => {
      if (item.startSec <= secInLoop) {
        if (item.title === TARGETS.kakurenbo) counts.kakurenbo += 1;
        else if (item.title === TARGETS.rizz) counts.rizz += 1;
        else if (item.title === TARGETS.chroma) counts.chroma += 1;
      }
    });
  } else {
    counts = { ...BASE_COUNTS };

    const diffSecNew = Math.floor((now - CUTOVER_AT_MS) / 1000);
    const cyclesNew = Math.floor(diffSecNew / 3600);
    const secInLoopNew = diffSecNew % 3600;

    counts.kakurenbo += cyclesNew * PER_CYCLE_NEW.kakurenbo;
    counts.rizz += cyclesNew * PER_CYCLE_NEW.rizz;
    counts.chroma += cyclesNew * PER_CYCLE_NEW.chroma;

    schedule.forEach((item) => {
      if (item.startSec <= secInLoopNew) {
        if (item.title === TARGETS.kakurenbo) counts.kakurenbo += 1;
        else if (item.title === TARGETS.rizz) counts.rizz += 1;
        else if (item.title === TARGETS.chroma) counts.chroma += 1;
      }
    });
  }

  document.getElementById("count-kakurenbo").textContent = counts.kakurenbo;
  document.getElementById("count-rizz").textContent = counts.rizz;
  document.getElementById("count-chroma").textContent = counts.chroma;
}

const toSec = (mmss) => {
  const [m, s] = mmss.split(":").map(Number);
  return m * 60 + s;
};

const formatKoreanTime = (str) => {
  const [m, s] = str.split(":").map(Number);
  return `${m}분 ${s.toString().padStart(2, "0")}초`;
};

const formatTimeMMSS = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

async function loadStreamingList() {
  const res = await fetch(STREAMING_LIST_URL);
  const text = await res.text();
  const rows = text.trim().split("\n").slice(1);

  schedule = rows.map((line) => {
    const [title, start, end, cover] = line.split(",").map((s) => s.trim());
    return {
      title,
      start,
      end,
      cover,
      startSec: toSec(start),
      endSec: toSec(end),
    };
  });

  renderPlaylist();
  tick();
  setInterval(tick, 1000);
}

function renderPlaylist() {
  const ul = document.getElementById("playlist");
  ul.innerHTML = schedule
    .map(
      (item, i) => `
<li data-index="${i}" class="flex flex-col p-2 rounded-lg shadow w-full opacity-50 transition-all bg-white text-[13px]">
  <div class="flex items-center gap-2">
    <div class="w-10 h-10 flex-shrink-0 bg-gray-200 rounded overflow-hidden">
      <img src="${item.cover}" alt="${
        item.title
      }" class="w-full h-full object-cover" />
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

function updateHighlight(secInLoop) {
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

function setRandomLoadingGif() {
  const gifs = [1, 2, 3, 4, 5, 6];
  const randomIndex = Math.floor(Math.random() * gifs.length);
  const selectedGifIndex = gifs[randomIndex];
  const loadingScreen = document.getElementById("loading-screen");
  const loadingGif = document.getElementById("loading-gif");

  if (loadingScreen) {
    loadingScreen.style.backgroundImage = `url('images/Bamby.png')`;
  }
  if (loadingGif) {
    loadingGif.src = `images/bamby${selectedGifIndex}.gif`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const userID = getUserID(); // 페이지 로드 시 사용자 ID 설정
  resetTodoListAtMidnight(); // 자정 초기화 함수 호출

  async function loadAllData() {
    await Promise.all([
      loadStreamingList(),
      cacheTodoData().then(loadTodoListData),
    ]);

    document.getElementById("loading-screen").style.display = "none";
    document.getElementById("main-content").classList.remove("invisible");
  }

  loadAllData();
  const guideModalOverlay = document.getElementById("guide-modal-overlay");
  const guideModalPanel = document.getElementById("guide-modal-panel");
  const openGuideButton = document.getElementById("guide-button");
  const closeGuideButtonX = document.getElementById("close-guide-button-x");
  const closeGuideButtonMain = document.getElementById(
    "close-guide-button-main"
  );
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  const openGuideModal = () => {
    // GA 이벤트: view_streaming_guide
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

  if (openGuideButton)
    openGuideButton.addEventListener("click", openGuideModal);
  if (closeGuideButtonX)
    closeGuideButtonX.addEventListener("click", closeGuideModal);
  if (closeGuideButtonMain)
    closeGuideButtonMain.addEventListener("click", closeGuideModal);
  if (guideModalOverlay)
    guideModalOverlay.addEventListener("click", closeGuideModal);

  // GA 이벤트: click_playlist_link
  document.querySelectorAll(".playlist-link").forEach((link) => {
    link.addEventListener("click", () => {
      gtag("event", "click_playlist_link", {
        platform: link.dataset.platform,
        device: link.dataset.device,
        user_id: userID,
      });
    });
  });

  // GA 이벤트: click_music_wave
  const musicWaveLink = document.getElementById("music-wave-link");
  if (musicWaveLink) {
    musicWaveLink.addEventListener("click", () => {
      gtag("event", "click_music_wave", { user_id: userID });
    });
  }

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

  const todolistOverlay = document.getElementById("todolist-overlay");
  const todolistPanel = document.getElementById("todolist-panel");
  const openTodolistButton = document.getElementById("open-todolist-button");
  const closeTodolistButton = document.getElementById("close-todolist-button");

  const openTodolist = () => {
    // GA 이벤트: open_todo_list
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

  const closeDetailsModalButton = document.getElementById(
    "close-details-modal-button"
  );
  const detailsModalOverlay = document.getElementById("details-modal-overlay");
  if (closeDetailsModalButton)
    closeDetailsModalButton.addEventListener("click", closeDetailsModal);
  if (detailsModalOverlay)
    detailsModalOverlay.addEventListener("click", closeDetailsModal);

  const GAUGE_GOAL = 10000;
  const gaugeFill = document.getElementById("gauge-fill");
  const gaugeCount = document.getElementById("gauge-count");
  const gaugeButton = document.getElementById("gauge-button");
  const cooldownCircle = document.getElementById("cooldown-circle");
  const infoButton = document.getElementById("info-button");
  const infoTooltip = document.getElementById("info-tooltip");
  let isGaugeCoolingDown = false;

  if (cooldownCircle) {
    const circumference = 2 * Math.PI * 16;
    cooldownCircle.style.strokeDasharray = circumference;
    cooldownCircle.style.strokeDashoffset = circumference;
  }

  const updateGaugeUI = (count) => {
    const safeCount = count || 0;
    const percentage = Math.min((safeCount / GAUGE_GOAL) * 100, 100);
    const labelPosition = Math.min(percentage, 95);
    if (gaugeFill) gaugeFill.style.width = `${percentage}%`;
    if (gaugeCount) {
      gaugeCount.textContent = safeCount.toLocaleString();
      gaugeCount.style.left = `${labelPosition}%`;
    }
  };
  const fetchInitialCount = async () => {
    try {
      const response = await fetch("/api/getGauge");
      if (!response.ok) throw new Error("API request failed");
      const data = await response.json();
      updateGaugeUI(data.count);
    } catch (error) {
      console.error("Error fetching gauge count:", error);
      updateGaugeUI(0);
    }
  };

  if (gaugeButton) {
    gaugeButton.addEventListener("click", async () => {
      if (isGaugeCoolingDown) return;

      // GA 이벤트: click_fire_gauge
      gtag("event", "click_fire_gauge", {
        user_id: userID,
      });

      isGaugeCoolingDown = true;
      gaugeButton.style.cursor = "not-allowed";

      if (cooldownCircle) {
        cooldownCircle.style.transition = "none";
        cooldownCircle.style.strokeDashoffset = 2 * Math.PI * 16;
        requestAnimationFrame(() => {
          cooldownCircle.style.transition = "stroke-dashoffset 1.5s linear";
          cooldownCircle.style.strokeDashoffset = 0;
        });
      }
      try {
        const response = await fetch("/api/incrementGauge", { method: "POST" });
        if (!response.ok) throw new Error("API request failed");
        const data = await response.json();
        updateGaugeUI(data.count);
      } catch (error) {
        console.error("Error incrementing gauge count:", error);
      }
      setTimeout(() => {
        isGaugeCoolingDown = false;
        gaugeButton.style.cursor = "pointer";
        if (cooldownCircle) {
          cooldownCircle.style.transition = "none";
          cooldownCircle.style.strokeDashoffset = 2 * Math.PI * 16;
        }
      }, 1500);
    });
  }

  if (infoButton) {
    infoButton.addEventListener("click", (e) => {
      e.stopPropagation();
      // GA 이벤트: view_fire_gauge_info
      gtag("event", "view_fire_gauge_info", { user_id: userID });
      infoTooltip.classList.toggle("hidden");
    });
  }

  document.addEventListener("click", (e) => {
    if (
      infoTooltip &&
      !infoButton.contains(e.target) &&
      !infoTooltip.contains(e.target)
    ) {
      infoTooltip.classList.add("hidden");
    }
  });

  fetchInitialCount();
});

window.addEventListener("DOMContentLoaded", () => {
  const tweetBtn = document.getElementById("tweet-button");
  const cheerInput = document.getElementById("cheer-message");

  if (tweetBtn && cheerInput) {
    tweetBtn.addEventListener("click", () => {
      const message = cheerInput.value.trim();
      if (!message) return alert("응원 멘트를 입력해주세요!");

      const userID = getUserID();

      gtag("event", "share_event_tweet", {
        event_category: "Event",
        event_label: message,
        user_id: userID,
      });

      const header = "🔥숨스숨투 응원하고 덕질자금 받자!🔥";
      const tags = "#PLLI_스밍투표_이벤트 #PLLI_화력응원";
      const url = "https://www.plli-checker.app";

      // ✅ 헤더, 메시지, 태그, URL 사이에 줄바꿈(\n\n)을 추가하여 가독성을 확보합니다.
      const tweetText = encodeURIComponent(
        `${header}\n\n${message}\n\n${tags}\n\n${url}`
      );

      // ✅ text 파라미터 하나만 사용하여 안정적으로 URL과 텍스트를 전달합니다.
      window.open(
        `https://twitter.com/intent/tweet?text=${tweetText}`,
        "_blank"
      );
    });
  }
});
