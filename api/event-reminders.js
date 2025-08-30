// api/event-reminders.js

import admin from "firebase-admin";
import { kv } from "@vercel/kv";

const TOKENS_KEY = "fcm-tokens"; // Vercel KV에서 사용할 키

// Vercel KV에서 모든 토큰 정보를 읽어오는 함수
async function readTokensFromKV() {
  try {
    const tokensData = await kv.hgetall(TOKENS_KEY);
    if (!tokensData) return [];
    // hgetall은 객체를 반환하므로, 값들만 배열로 추출
    return Object.values(tokensData);
  } catch (error) {
    console.error("Failed to read tokens from KV:", error);
    return [];
  }
}

function ensureAdmin() {
  if (!admin.apps.length) {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!json) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON not set");
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(json)),
    });
  }
}

async function getAllEvents() {
  try {
    const raw = await kv.hgetall("events");
    if (!raw) return [];
    return Object.values(raw)
      .map((v) => (typeof v === "string" ? JSON.parse(v) : v))
      .filter(Boolean);
  } catch (e) {
    if (String(e?.message || e).includes("WRONGTYPE")) {
      await kv.del("events");
      return [];
    }
    throw e;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const events = await getAllEvents();
    const nowUtc = new Date(); // 서버의 현재 시간 (UTC)

    const windowMs = 60 * 1000; // 1분 윈도우
    const targetMs = 15 * 60 * 1000; // 15분 전 알림

    const candidates = events.filter((ev) => {
      if (
        !ev?.start ||
        (typeof ev.start === "string" && !ev.start.includes("T"))
      ) {
        return false;
      }

      // ✅ 수정: ev.start 문자열에 KST(+09:00)를 명시하여 Date 객체 생성
      // 이렇게 하면 서버 환경(UTC)에 상관없이 항상 정확한 KST 시간으로 인식됩니다.
      const startKstDate = new Date(ev.start + "+09:00");
      if (isNaN(startKstDate.getTime())) return false;

      // ✅ 수정: 이벤트의 UTC 타임스탬프와 현재 UTC 타임스탬프를 직접 비교
      const diff = startKstDate.getTime() - nowUtc.getTime();

      // 15분 전후 1분 내에 해당하는지 확인
      return Math.abs(diff - targetMs) <= windowMs;
    });

    if (!candidates.length) {
      return res.status(200).json({ sent: 0, note: "no events in window" });
    }

    // Vercel KV에서 토큰 정보 읽기
    const allTokens = await readTokensFromKV();
    const targets = allTokens
      .filter((t) => t.calendarOptIn)
      .map((t) => t.token);

    if (!targets.length) {
      return res.status(200).json({ sent: 0, note: "no opt-in tokens" });
    }

    ensureAdmin();

    let sentCount = 0,
      skipped = 0;
    for (const ev of candidates) {
      const id = ev.id || ev.ID || `${ev.title || "이벤트"}@${ev.start}`;
      const dedupKey = `reminder-sent:${id}`;
      const setOk = await kv.set(dedupKey, "1", { ex: 60 * 30, nx: true });
      if (setOk !== "OK") {
        skipped++;
        continue;
      }

      // ✅ 수정: 서버 시간대와 무관하게 항상 KST로 시간을 포맷팅하는 로직
      const startTimeKst = new Date(ev.start + "+09:00");

      // toLocaleString을 사용해 KST 시간(HH:mm) 문자열을 직접 생성
      const timeStringKst = startTimeKst.toLocaleTimeString("ko-KR", {
        timeZone: "Asia/Seoul",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      // timeStringKst는 "15:40"과 같은 형태가 됨

      const result = await admin.messaging().sendEachForMulticast({
        tokens: targets,
        webpush: {
          notification: {
            title: `🗓️ 곧 시작: ${ev.title || "이벤트"}`,
            body: `${timeStringKst} 시작 (15분 전)`, // 정확한 KST 시간이 여기에 표시됨
            icon: "/icon-192.png",
            tag: `event-${id}`,
          },
          headers: { TTL: "900" },
          fcmOptions: { link: "/notice.html" },
        },
      });

      sentCount += result.successCount;
    }

    return res
      .status(200)
      .json({ sent: sentCount, skipped, candidates: candidates.length });
  } catch (e) {
    console.error("[event-reminders]", e);
    return res.status(500).json({ error: e.message });
  }
}
