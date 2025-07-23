import { STREAMING_LIST_URL, TODO_LIST_URL } from './config.js';
import { setSchedule, setAllTodoData } from './state.js';
import { initializeStreamingUI, renderTodoList } from './ui.js';

export async function loadStreamingList() {
  try {
    const res = await fetch(STREAMING_LIST_URL);
    const text = await res.text();
    const rows = text.trim().split('\n').slice(1);
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

function toSec(mmss) {
    const [m, s] = mmss.split(":").map(Number);
    return m * 60 + s;
}
