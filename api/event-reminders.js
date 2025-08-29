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

    const nowUtc = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const nowKst = new Date(nowUtc.getTime() + kstOffset);

    const windowMs = 60 * 1000; // 1분 윈도우
    const targetMs = 15 * 60 * 1000; // 15분

    const candidates = events.filter((ev) => {
      if (!ev?.start) return false;
      if (typeof ev.start === "string" && !ev.start.includes("T")) return false;

      const startKst = new Date(ev.start + "Z").getTime() + kstOffset;
      if (isNaN(startKst)) return false;
      const diff = startKst - nowKst.getTime();
      return Math.abs(diff - targetMs) <= windowMs;
    });

    if (!candidates.length)
      return res.status(200).json({ sent: 0, note: "no events in window" });

    // Vercel KV에서 토큰 정보 읽기
    const allTokens = await readTokensFromKV();
    const targets = allTokens
      .filter((t) => t.calendarOptIn)
      .map((t) => t.token);

    if (!targets.length)
      return res.status(200).json({ sent: 0, note: "no opt-in tokens" });

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

      const startTimeKst = new Date(
        new Date(ev.start + "Z").getTime() + kstOffset
      );
      const hh = String(startTimeKst.getUTCHours()).padStart(2, "0");
      const mm = String(startTimeKst.getUTCMinutes()).padStart(2, "0");

      const result = await admin.messaging().sendEachForMulticast({
        tokens: targets,
        webpush: {
          notification: {
            title: `🗓️ 곧 시작: ${ev.title || "이벤트"}`,
            body: `${hh}:${mm} 시작 (15분 전)`,
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
