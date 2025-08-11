// api/save-token.js

const fs = require("fs");
const path = require("path");

const TOKEN_FILE = path.join("/tmp", "tokens.json");

function readTokens() {
  if (!fs.existsSync(TOKEN_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
  } catch (error) {
    return [];
  }
}

function saveTokens(tokens) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
}

export default function handler(req, res) {
  // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
  // GET 요청을 처리하는 로직 추가
  if (req.method === "GET") {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: "Token required" });
    }
    const tokens = readTokens();
    const existingToken = tokens.find((t) => t.token === token);
    if (existingToken) {
      return res.status(200).json({
        noticeOptIn: existingToken.noticeOptIn || false,
        calendarOptIn: existingToken.calendarOptIn || false,
      });
    } else {
      // 저장된 설정이 없으면 기본값 false를 반환
      return res.status(200).json({ noticeOptIn: false, calendarOptIn: false });
    }
  }
  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

  // POST 요청 처리 로직 (기존과 동일)
  if (req.method === "POST") {
    const { token, noticeOptIn, calendarOptIn } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Token required" });
    }
    const tokens = readTokens();
    const index = tokens.findIndex((t) => t.token === token);

    if (index > -1) {
      tokens[index].noticeOptIn = noticeOptIn;
      tokens[index].calendarOptIn = calendarOptIn;
    } else {
      tokens.push({ token, noticeOptIn, calendarOptIn });
    }
    saveTokens(tokens);
    return res.status(200).json({ success: true });
  }

  // 허용되지 않은 메소드
  return res.status(405).json({ error: "Method Not Allowed" });
}
