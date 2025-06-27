// api/cron.js

import { getMessaging } from "firebase-admin/messaging";
import { initializeApp, cert } from "firebase-admin/app";
import { readFileSync } from "fs";
import path from "path";

// Vercel 서버리스 환경에서는 파일 시스템 접근이 까다로우므로,
// 서비스 계정 키는 환경 변수로 관리하는 것이 가장 안정적입니다.
// 하지만 우선은 이전에 등록한 비밀(Secret)을 사용하도록 코드를 작성하겠습니다.
// 이 부분은 나중에 Vercel 대시보드에서 환경 변수로 설정해야 합니다.
const serviceAccount = JSON.parse(
  readFileSync(path.resolve("./plli-service-account.json"), "utf8")
);

// Firebase 앱이 이미 초기화되었는지 확인하여 중복 초기화를 방지합니다.
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}


const TOKEN_FILE = path.join('/tmp', 'tokens.json');

function readTokens() {
  if (!fs.existsSync(TOKEN_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
  } catch (error) {
    return [];
  }
}

// Vercel Cron Job이 호출할 기본 함수
export default function handler(req, res) {
  console.log("CRON JOB: 정각 알림 발송 작업을 시작합니다.");

  const allTokens = readTokens();
  const optedInTokens = allTokens.filter(t => t.alarmOptIn).map(t => t.token);

  if (optedInTokens.length === 0) {
    console.log("CRON JOB: 알림을 받을 사용자가 없어 작업을 종료합니다.");
    return res.status(200).send("No users to notify");
  }

  const message = {
    notification: {
      title: "🕐 정각 알림",
      body: "스밍리스트 확인할 시간이에요! 🔥",
    },
    tokens: optedInTokens,
  };

  getMessaging().sendEachForMulticast(message)
    .then((response) => {
      const logMessage = `CRON JOB: ${response.successCount} 성공, ${response.failureCount} 실패`;
      console.log(logMessage);
      res.status(200).send(logMessage);
    })
    .catch((error) => {
      console.error("CRON JOB: 알림 발송 중 오류 발생:", error);
      res.status(500).send("Error sending notifications");
    });
}