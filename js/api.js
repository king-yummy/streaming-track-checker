import {
  STREAMING_LIST_URL,
  TODO_LIST_URL,
  NOTICE_LIST_URL,
} from "./config.js";
import { setSchedule, setAllTodoData } from "./state.js";
import {
  initializeStreamingUI,
  renderTodoList,
  renderNoticeList,
} from "./ui.js";

function toSec(mmss) {
  const [m, s] = mmss.split(":").map(Number);
  return m * 60 + s;
}

export async function loadStreamingList() {
  try {
    const res = await fetch(STREAMING_LIST_URL);
    const text = await res.text();
    const rows = text.trim().split("\n").slice(1);
    const newSchedule = rows.map((line) => {
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
    setSchedule(newSchedule);
    sessionStorage.setItem("streamingSchedule", JSON.stringify(newSchedule));
    initializeStreamingUI();
  } catch (error) {
    console.error("스트리밍 리스트 로딩 실패:", error);
  }
}

export async function loadTodoListData() {
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

    const newTodoData = rows.map((row) => {
      const values = row.split(/,(?=(?:(?:[^\"]*\"){2})*[^\"]*$)/);
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

    setAllTodoData(newTodoData);
    sessionStorage.setItem("todoData", JSON.stringify(newTodoData));
    renderTodoList(newTodoData);
  } catch (error) {
    console.error("투두리스트 데이터 로딩 실패:", error);
    const container = document.getElementById("todolist-container");
    if (container)
      container.innerHTML =
        '<p class="text-center text-red-500">데이터를 불러오는 데 실패했습니다.</p>';
  }
}

// --- 이 함수를 아래 내용으로 교체합니다 ---
export async function loadNoticeList() {
  try {
    const response = await fetch(NOTICE_LIST_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    const allRows = text.trim().split(/\r?\n/);
    if (allRows.length < 2) return [];

    const headerRow = allRows[0];
    const contentRows = allRows.slice(1);
    const headers = headerRow.split(",").map((h) => h.trim());

    const noticeData = contentRows.map((row) => {
      // ▼▼▼ 핵심 수정 부분 ▼▼▼
      // 이 정규식은 따옴표 안의 쉼표나 줄바꿈은 무시하고, 필드를 나누는 쉼표만 인식합니다.
      const values = row.split(/,(?=(?:(?:[^\"]*\"){2})*[^\"]*$)/);
      // ▲▲▲ 핵심 수정 부분 ▲▲▲

      const obj = {};
      headers.forEach((header, i) => {
        let value = (values[i] || "").trim();
        // 따옴표로 감싸인 경우, 양쪽 끝 따옴표를 제거합니다.
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1).replace(/""/g, '"');
        }
        obj[header] = value;
      });
      return obj;
    });

    return noticeData;
  } catch (error) {
    console.error("공지사항 데이터 로딩 실패:", error);
    return [];
  }
}
