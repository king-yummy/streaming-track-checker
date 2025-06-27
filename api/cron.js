// api/cron.js (시간 조작 기능이 포함된, 즉시 확인용 테스트 버전)

import { getMessaging } from "firebase-admin/messaging";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import fs from "fs";
import path from "path";

// 서비스 계정 키 파일을 읽어옵니다.
const serviceAccount = JSON.parse(
  fs.readFileSync(path.resolve("./plli-service-account.json"), "utf8")
);

// Firebase 앱 중복 초기화 방지
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const TOKEN_FILE = path.join("/tmp", "tokens.json");

function readTokens() {
  if (!fs.existsSync(TOKEN_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
  } catch (error) {
    return [];
  }
}

// Vercel Cron Job이 호출할 기본 함수
export default function handler(req, res) {
  // --- 시간 체크 로직 ---
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstTime = new Date(now.getTime() + kstOffset);

  // ✅ [테스트용 코드!] 아래 줄이 현재 시간을 무조건 '7시'로 만듭니다.
  // 실제 운영 시에는 이 줄을 지우고 아래 줄의 주석을 풀어주세요.
  const kstHour = 7;
  // const kstHour = kstTime.getUTCHours(); // <-- 실제 운영용 코드

  // 알림을 보낼 시간대 (오전 7시, 10시, 오후 1시, 4시, 7시, 10시, 새벽 1시)
  const targetHours = [7, 10, 13, 16, 19, 22, 1];

  // 현재 시간이 알림을 보낼 시간이 아니면, 아무것도 하지 않고 종료
  if (!targetHours.includes(kstHour)) {
    const logMessage = `CRON JOB: 현재 시간(${kstHour}시)은 발송 시간이 아니므로 건너뜁니다.`;
    console.log(logMessage);
    return res.status(200).send(logMessage);
  }

  // --- 알림 발송 로직 ---
  console.log(
    `CRON JOB: ${kstHour}시 알림 발송 작업을 시작합니다. (테스트 모드)`
  );

  const allTokens = readTokens();
  const optedInTokens = allTokens
    .filter((t) => t.alarmOptIn)
    .map((t) => t.token);

  if (optedInTokens.length === 0) {
    console.log("CRON JOB: 알림을 받을 사용자가 없어 작업을 종료합니다.");
    return res.status(200).send("No users to notify");
  }

  // "스밍 체크" 알림 메시지
  const message = {
    notification: {
      title: "👀 스밍 체크!",
      body: "스밍이 멈춰있진 않나요? 한번 확인해주세요! 🎵",
    },
    tokens: optedInTokens,
  };

  getMessaging()
    .sendEachForMulticast(message)
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
