// api/push-test.js
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import os from "os";

const TMP_DIR = path.join(os.tmpdir(), "plli-checker");
const TOKEN_FILE = path.join(TMP_DIR, "tokens.json");

function readTokens() {
  if (!fs.existsSync(TOKEN_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8")); }
  catch { return []; }
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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { kind = "notice", title, body } = req.body || {};
  const tokens = readTokens();
  const targets = tokens
    .filter(t => (kind === "notice" ? t.noticeOptIn : t.calendarOptIn))
    .map(t => t.token);

  if (!targets.length) return res.status(200).json({ sent: 0, note: "no opt-in tokens" });

  try {
    ensureAdmin();
    const result = await admin.messaging().sendEachForMulticast({
      tokens: targets,
      notification: {
        title: title || (kind === "notice" ? "📢 테스트 공지" : "🗓️ 테스트 캘린더"),
        body: body || "이 알림이 보이면 경로 정상!",
      },
    });
    return res.status(200).json({ sent: result.successCount, failed: result.failureCount });
  } catch (e) {
    console.error("[push-test]", e);
    return res.status(500).json({ error: e.message });
  }
}
