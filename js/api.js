// js/api.js — Google Sheets API v4 (GET) 사용 버전

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

/** "mm:ss" → 초 */
function toSec(mmss = "") {
  if (!mmss || typeof mmss !== "string" || !mmss.includes(":")) return 0;
  const [m, s] = mmss.split(":").map((n) => Number(n) || 0);
  return m * 60 + s;
}

/** gid(sheetId) → 시트 제목(title) 캐싱 조회 */
const __sheetTitleCache = new Map();
async function getSheetTitleById(sheetId) {
  if (__sheetTitleCache.has(sheetId)) return __sheetTitleCache.get(sheetId);

  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}` +
    `?fields=sheets(properties(sheetId,title))&key=${GOOGLE_SHEETS_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet meta. HTTP ${res.status}`);
  }
  const json = await res.json();
  const title = json?.sheets?.find((s) => s?.properties?.sheetId === sheetId)
    ?.properties?.title;

  if (!title) {
    throw new Error(
      `sheetId(${sheetId})에 해당하는 시트 제목을 찾지 못했습니다.`
    );
  }
  __sheetTitleCache.set(sheetId, title);
  return title;
}

/** 시트 제목으로 A1 Range rows 불러오기 (키만으로 접근, 공개 시트 전제) */
async function fetchRowsByTitle(sheetTitle, a1Range = "A:Z") {
  const range = encodeURIComponent(`${sheetTitle}!${a1Range}`);
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}` +
    `/values:batchGet?ranges=${range}&majorDimension=ROWS&key=${GOOGLE_SHEETS_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  const json = await res.json();
  return json?.valueRanges?.[0]?.values ?? [];
}

/** gid 지정해서 값 불러오기 (내부 헬퍼) */
async function fetchRowsByGid(sheetId, a1Range = "A:Z") {
  const title = await getSheetTitleById(sheetId);
  return fetchRowsByTitle(title, a1Range);
}

/* =========================
 *  Public Loader Functions
 * ========================= */

/** 스트리밍 리스트: [제목, 시작, 종료, 표지] */
export async function loadStreamingList() {
  try {
    const values = await fetchRowsByGid(STREAMING_SHEET_ID, "A:D");
    if (!values || values.length < 2) {
      setSchedule([]);
      sessionStorage.setItem("streamingSchedule", "[]");
      initializeStreamingUI();
      return;
    }

    const dataRows = values.slice(1); // 0행 = 헤더
    const newSchedule = dataRows.map((row) => {
      const [title = "", start = "", end = "", cover = ""] = row.map((v) =>
        typeof v === "string" ? v.trim() : v
      );
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

/** 투두리스트: 1행 헤더 기반 객체화 */
export async function loadTodoListData() {
  try {
    const values = await fetchRowsByGid(TODO_SHEET_ID, "A:Z");
    if (!values || values.length === 0) {
      setAllTodoData([]);
      sessionStorage.setItem("todoData", "[]");
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
  } catch (error) {
    console.error("투두리스트 데이터 로딩 실패:", error);
    const container = document.getElementById("todolist-container");
    if (container) container.innerHTML = " 데이터를 불러오는 데 실패했습니다. ";
  }
}

/** 공지사항: 1행 헤더 기반 객체 배열 반환 */
export async function loadNoticeList() {
  try {
    const values = await fetchRowsByGid(NOTICE_SHEET_ID, "A:Z");
    if (!values || values.length < 2) return [];

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

    // 화면에 뿌리는 함수가 따로 있으면 여기서 호출
    if (typeof renderNoticeList === "function") {
      renderNoticeList(noticeData);
    }
    return noticeData;
  } catch (error) {
    console.error("공지사항 데이터 로딩 실패:", error);
    return [];
  }
}
