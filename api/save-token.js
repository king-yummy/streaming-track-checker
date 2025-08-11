// api/save-token.js
const fs = require("fs");
const path = require("path");
const os = require("os");

// OS 공용 임시 디렉터리 하위 폴더 사용 (예: C:\Users\...\AppData\Local\Temp\plli-checker)
const TMP_DIR = path.join(os.tmpdir(), "plli-checker");
const TOKEN_FILE = path.join(TMP_DIR, "tokens.json");

function ensureTmpDir() {
  try {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  } catch (e) {
    // 디렉터리 생성 실패 시 로그만 찍고 진행
    console.error("[save-token] TMP_DIR 만들기 실패:", e);
  }
}

function readTokens() {
  ensureTmpDir();
  if (!fs.existsSync(TOKEN_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
  } catch (error) {
    return [];
  }
}

function saveTokens(tokens) {
  ensureTmpDir();
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), "utf8");
}

export default function handler(req, res) {
  if (req.method === "GET") {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "Token required" });

    const tokens = readTokens();
    const existingToken = tokens.find((t) => t.token === token);
    if (existingToken) {
      return res.status(200).json({
        noticeOptIn: existingToken.noticeOptIn || false,
        calendarOptIn: existingToken.calendarOptIn || false,
      });
    }
    return res.status(200).json({ noticeOptIn: false, calendarOptIn: false });
  }

  if (req.method === "POST") {
    const { token, noticeOptIn, calendarOptIn } = req.body;
    if (!token) return res.status(400).json({ error: "Token required" });

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

  return res.status(405).json({ error: "Method Not Allowed" });
}
