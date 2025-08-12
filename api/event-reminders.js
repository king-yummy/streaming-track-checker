// api/event-reminders.js
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import os from "os";
import { kv } from "@vercel/kv";

const TMP_DIR = path.join(os.tmpdir(), "plli-checker");
const TOKEN_FILE = path.join(TMP_DIR, "tokens.json");

function readTokens() {
  if (!fs.existsSync(TOKEN_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
  } catch {
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
      .map((v) => {
        if (typeof v === "string") {
          try {
            return JSON.parse(v);
          } catch {
            return null;
          }
        }
        return v; // 이미 객체인 경우 그대로 사용
      })
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

    const now = Date.now();
    const windowMs = 60 * 1000; // 1분 윈도우
    const targetMs = 15 * 60 * 1000; // 15분

    const candidates = events.filter((ev) => {
      if (!ev?.start) return false;
      if (typeof ev.start === "string" && !ev.start.includes("T")) return false;
      const start = new Date(ev.start).getTime();
      if (isNaN(start)) return false;
      const diff = start - now;
      return Math.abs(diff - targetMs) <= windowMs;
    });

    if (!candidates.length)
      return res.status(200).json({ sent: 0, note: "no events in window" });

    const allTokens = readTokens();
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

      const start = new Date(ev.start);
      const hh = String(start.getHours()).padStart(2, "0");
      const mm = String(start.getMinutes()).padStart(2, "0");

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
