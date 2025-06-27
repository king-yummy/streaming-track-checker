// server.js (1시 발송, UX 라이팅 최종 수정본)

const express = require("express");
const fs = require("fs");
const cors = require("cors");
const admin = require("firebase-admin");
const cron = require("node-cron");

const app = express();
const PORT = process.env.PORT || 3001;

// --- Firebase Admin SDK 초기화 ---
const serviceAccount = require("./plli-service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(cors());
app.use(express.json());

const TOKEN_FILE = "/tmp/tokens.json";

// --- 토큰 파일 읽기/쓰기 함수 ---
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

// --- API 엔드포인트 ---
app.post("/api/save-token", (req, res) => {
  const { token, alarmOptIn } = req.body;
  if (!token) return res.status(400).json({ error: "Token required" });

  const tokens = readTokens();
  const index = tokens.findIndex((t) => t.token === token);

  if (index > -1) {
    tokens[index].alarmOptIn = alarmOptIn;
  } else {
    tokens.push({ token, alarmOptIn });
  }

  saveTokens(tokens);
  res.json({ success: true });
});

// --- 스케줄러: 정각마다 푸시 알림 발송 ---
cron.schedule("* * * * *", () => {
  // "매시간 0분" (정각)
  const allTokens = readTokens();
  const optedInTokens = allTokens
    .filter((t) => t.alarmOptIn)
    .map((t) => t.token);

  if (optedInTokens.length === 0) return;

  // ✅ 사용자님 의견을 반영한, 명확한 UX 라이팅 적용
  const message = {
    notification: {
      title: "⚙️ 정각 알림 기능 테스트 안내",
      body: "이 알림은 기능 안정화를 위한 테스트입니다. 정상적으로 수신하셨다면 무시하셔도 괜찮습니다. 감사합니다!",
    },
    tokens: optedInTokens,
  };

  admin
    .messaging()
    .sendEachForMulticast(message)
    .then((response) => {
      console.log(
        `[정각 테스트] 알림 발송: ${response.successCount} 성공, ${response.failureCount} 실패`
      );
    })
    .catch((error) => {
      console.error("[정각 테스트] 알림 발송 중 오류 발생:", error);
    });
});

// --- 서버 실행 (Vercel 환경에 맞게 수정) ---
// Vercel이 알아서 서버를 실행하므로, app 객체만 넘겨줍니다.
module.exports = app;
