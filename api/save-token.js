// api/save-token.js

const fs = require("fs");
const path = require("path");

// Vercel의 서버리스 환경에서는 파일을 /tmp/ 경로에만 쓸 수 있습니다.
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

// Vercel 서버리스 함수는 이렇게 만듭니다.
export default function handler(req, res) {
  // POST 요청이 아니면 거부
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { token, alarmOptIn } = req.body;
  if (!token) {
    return res.status(400).json({ error: "Token required" });
  }

  const tokens = readTokens();
  const index = tokens.findIndex((t) => t.token === token);

  if (index > -1) {
    tokens[index].alarmOptIn = alarmOptIn;
  } else {
    tokens.push({ token, alarmOptIn });
  }

  saveTokens(tokens);

  // 성공적으로 처리되었음을 클라이언트에 알림
  res.status(200).json({ success: true });
}
