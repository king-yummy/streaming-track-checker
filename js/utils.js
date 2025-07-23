export function getUserID() {
  let userID = localStorage.getItem("plli_user_id");
  if (!userID) {
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

export const formatBold = (text) => {
  if (!text) return "";
  return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
};

export const toSec = (mmss) => {
  const [m, s] = mmss.split(":").map(Number);
  return m * 60 + s;
};

export const formatKoreanTime = (str) => {
  const [m, s] = str.split(":").map(Number);
  return `${m}분 ${s.toString().padStart(2, "0")}초`;
};

export const formatTimeMMSS = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};
