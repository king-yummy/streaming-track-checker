import {
  SPREADSHEET_ID,
  GOOGLE_SHEETS_API_KEY,
  STREAMING_SHEET_ID,
  TODO_SHEET_ID,
  NOTICE_SHEET_ID,
} from "./config.js";
import { setSchedule, setAllTodoData } from "./state.js";
import {
  initializeStreamingUI,
  renderTodoList,
  renderNoticeList,
} from "./ui.js";

// Google Sheets API v4 헬퍼: sheetId(=gid)로 값들을 모두 가져온다
async function fetchSheetData(sheetId) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchGetByDataFilter?key=${GOOGLE_SHEETS_API_KEY}`;
  const payload = {
    dataFilters: [{ gridRange: { sheetId } }],
    majorDimension: "ROWS",
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  const data = await res.json();
  const ranges = data.valueRanges || [];
  const valueRange = ranges[0] || {};
  return valueRange.values || [];
}

// 스트리밍 리스트 로딩
export async function loadStreamingList() {
  try {
    const values = await fetchSheetData(STREAMING_SHEET_ID);
    const rows = values.slice(1); // 첫 행은 헤더
    const newSchedule = rows.map((row) => {
      const [title, start, end, cover] = row.map((c) =>
        typeof c === "string" ? c.trim() : c
      );
      return {
        title: title ?? "",
        start: start ?? "",
        end: end ?? "",
        cover: cover ?? "",
        startSec: toSec(start ?? ""),
        endSec: toSec(end ?? ""),
      };
    });
    setSchedule(newSchedule);
    sessionStorage.setItem("streamingSchedule", JSON.stringify(newSchedule));
    initializeStreamingUI();
  } catch (err) {
    console.error("스트리밍 리스트 로딩 실패:", err);
  }
}

// 투두리스트 로딩
export async function loadTodoListData() {
  try {
    const values = await fetchSheetData(TODO_SHEET_ID);
    if (!values.length) {
      setAllTodoData([]);
      sessionStorage.setItem("todoData", JSON.stringify([]));
      renderTodoList([]);
      return;
    }
    const headers = values[0].map((h) =>
      typeof h === "string" ? h.trim() : h
    );
    const rows = values.slice(1);
    const newTodoData = rows.map((row) => {
      const obj = {};
      headers.forEach((header, i) => {
        let value = row[i] ?? "";
        if (typeof value === "string") value = value.trim();
        obj[header] = value === "NULL" || value === "" ? null : value;
      });
      return obj;
    });
    setAllTodoData(newTodoData);
    sessionStorage.setItem("todoData", JSON.stringify(newTodoData));
    renderTodoList(newTodoData);
  } catch (err) {
    console.error("투두리스트 데이터 로딩 실패:", err);
    const container = document.getElementById("todolist-container");
    if (container) container.innerHTML = " 데이터를 불러오는 데 실패했습니다. ";
  }
}

// 공지사항 리스트 로딩
export async function loadNoticeList() {
  try {
    const values = await fetchSheetData(NOTICE_SHEET_ID);
    if (values.length < 2) return [];
    const headers = values[0].map((h) =>
      typeof h === "string" ? h.trim() : h
    );
    const contentRows = values.slice(1);
    const noticeData = contentRows.map((row) => {
      const obj = {};
      headers.forEach((header, i) => {
        let value = row[i] ?? "";
        if (typeof value === "string") value = value.trim();
        obj[header] = value;
      });
      return obj;
    });
    return noticeData;
  } catch (err) {
    console.error("공지사항 데이터 로딩 실패:", err);
    return [];
  }
}
