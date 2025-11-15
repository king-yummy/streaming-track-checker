// js/api.js — Google Sheets API v4 (GET) + 시트제목 직접 사용 버전

import {
  SPREADSHEET_ID,
  GOOGLE_SHEETS_API_KEY,
  STREAMING_SHEET_TITLE,
  TODO_SHEET_TITLE,
  NOTICE_SHEET_TITLE,
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

/** 시트 제목으로 A1 Range rows 불러오기 (공개 시트 + API 키 전제) */
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

/* =========================
 * Public Loader Functions
 * ========================= */

/** 스트리밍 리스트: [제목, 시작, 종료, 표지] */
export async function loadStreamingList() {
  try {
    const values = await fetchRowsByTitle(STREAMING_SHEET_TITLE, "A:D");
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
    const values = await fetchRowsByTitle(TODO_SHEET_TITLE, "A:Z");
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

/** 공지사항: 백엔드 API (/api/notices) 연동 + 'New' 로직 수정 */
export async function loadNoticeList() {
  try {
    // 1. 우리가 만든 API(/api/notices) 호출
    const res = await fetch("/api/notices");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const rawData = await res.json(); // API가 최신순으로 정렬해서 줌

    // --- 🔴 (수정) 'New' 아이콘 계산 로직 (24시간 이내) 🔴 ---
    // 1. KST (한국 시간) 기준 '현재 시간'의 타임스탬프
    const nowKST = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })
    );
    const nowTimestamp = nowKST.getTime();
    // 24시간을 밀리초로 계산
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    // --- 🔴 로직 수정 끝 🔴 ---

    // 3. 기존 UI와 호환되도록 키 이름 변경 + 'New' 계산
    const noticeData = rawData.map((item) => {
      let isNewBoolean = false; // 기본값은 false
      try {
        // item.id가 "noti_1731654560000" 같은 형태라고 가정
        const timestamp = parseInt(item.id.split("_")[1], 10);
        if (!isNaN(timestamp)) {
          const diffMs = nowTimestamp - timestamp;
          // 생성된 지 0초 ~ 24시간 사이인 경우 true
          isNewBoolean = diffMs > 0 && diffMs < TWENTY_FOUR_HOURS_MS;
        }
      } catch (e) {
        // ID 형식이 다르더라도 오류 방지
        console.warn("Could not parse timestamp from notice ID:", item.id);
      }

      // [중요!] js/ui.js가 "TRUE" 문자열을 기대하므로 변환
      const isNewString = isNewBoolean ? "TRUE" : "FALSE";

      return {
        Title: item.title,
        Content: item.content,
        Date: item.date, // 관리자가 입력한 날짜 (표시용)
        New: isNewString, // 👈 "TRUE" 또는 "FALSE" 문자열로 전달
        id: item.id,
      };
    });

    // 4. 화면에 그리기 (js/main.js에서도 이 함수를 호출함)
    if (typeof renderNoticeList === "function") {
      renderNoticeList(noticeData);
    }
    return noticeData;
  } catch (error) {
    console.error("공지사항 데이터 로딩 실패:", error);
    return [];
  }
}
