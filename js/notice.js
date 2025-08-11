// js/notice.js
import { loadNoticeList } from "./api.js";
import { renderNoticeList } from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
  // notice.html 페이지일 때만 실행
  if (window.location.pathname.endsWith("notice.html")) {
    loadNoticeList().then(renderNoticeList);
  }
});
