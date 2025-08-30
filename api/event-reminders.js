// /api/event-reminders.js (통합 버전)

import { kv } from "@vercel/kv";
import admin from "firebase-admin";
import { google } from "googleapis";

// --- 상수 설정 ---
const TOKENS_KEY = "fcm-tokens";
const SPREADSHEET_ID = "1tGslp_8ahx8E5Y8kvIFq3DAcciLgtSyTvlTBROOrsKg";
const NOTICE_SHEET_TITLE = "notice";
const LAST_NOTICE_ID_KEY = "last-sent-notice-id";

// --- Firebase Admin SDK 초기화 ---
function ensureAdmin() {
  if (!admin.apps.length) {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!json) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON not set");
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(json)),
    });
  }
}

// --- 공통 헬퍼 함수: 모든 토큰 정보 읽기 ---
async function readTokensFromKV() {
  try {
    const tokensData = await kv.hgetall(TOKENS_KEY);
    return tokensData ? Object.values(tokensData) : [];
  } catch (error) {
    console.error("Failed to read tokens from KV:", error);
    return [];
  }
}

// --- 캘린더 이벤트 알림 처리 로직 ---
async function handleEventReminders(optedInTokens) {
  if (optedInTokens.length === 0) {
    console.log("[Events] No users opted in for notifications.");
    return 0;
  }

  const events = await (async () => {
    try {
      const raw = await kv.hgetall("events");
      return raw
        ? Object.values(raw)
            .map((v) => (typeof v === "string" ? JSON.parse(v) : v))
            .filter(Boolean)
        : [];
    } catch (e) {
      if (String(e?.message || e).includes("WRONGTYPE")) {
        await kv.del("events");
        return [];
      }
      throw e;
    }
  })();

  const nowUtc = new Date();
  const windowMs = 3 * 60 * 1000;
  const targetMs = 15 * 60 * 1000;

  const candidates = events.filter((ev) => {
    if (!ev?.start || (typeof ev.start === "string" && !ev.start.includes("T")))
      return false;
    const startKstDate = new Date(ev.start + "+09:00");
    if (isNaN(startKstDate.getTime())) return false;
    const diff = startKstDate.getTime() - nowUtc.getTime();
    return Math.abs(diff - targetMs) <= windowMs;
  });

  if (candidates.length === 0) {
    console.log("[Events] No events in the notification window.");
    return 0;
  }

  let sentCount = 0;
  for (const ev of candidates) {
    const uniqueNotificationId = `${ev.id || ev.ID}@${ev.start}`;
    const dedupKey = `reminder-sent:${uniqueNotificationId}`;
    if (await kv.get(dedupKey)) continue; // 중복 방지
    await kv.set(dedupKey, "1", { ex: 60 * 30 });

    const startTimeKst = new Date(ev.start + "+09:00");
    const timeStringKst = startTimeKst.toLocaleTimeString("ko-KR", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const result = await admin.messaging().sendEachForMulticast({
      tokens: optedInTokens,
      webpush: {
        notification: {
          title: `🗓️ 곧 시작: ${ev.title || "이벤트"}`,
          body: `${timeStringKst} 시작 (15분 전)`,
          icon: "/icon-192.png",
          tag: `event-${uniqueNotificationId}`,
        },
        headers: { TTL: "900" },
        fcmOptions: { link: "/notice.html" },
      },
    });
    sentCount += result.successCount;
  }
  console.log(`[Events] Sent ${sentCount} calendar reminders.`);
  return sentCount;
}

// --- 새 공지 알림 처리 로직 ---
async function handleNoticeChecks(optedInTokens) {
  if (optedInTokens.length === 0) {
    console.log("[Notices] No users opted in for notifications.");
    return 0;
  }

  // [수정] 인증 정보 불러오는 방식 변경
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: serviceAccount.client_email,
      private_key: serviceAccount.private_key,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${NOTICE_SHEET_TITLE}!A:Z`,
  });

  const rows = res.data.values;
  if (!rows || rows.length < 2) return 0;

  const headers = rows[0];
  const notices = rows.slice(1).map((row) => {
    const notice = {};
    headers.forEach((header, i) => {
      notice[header] = row[i] || "";
    });
    return notice;
  });

  const latestNotice = notices.sort(
    (a, b) => parseInt(b.ID) - parseInt(a.ID)
  )[0];
  if (!latestNotice) return 0;

  const latestNoticeId = parseInt(latestNotice.ID);
  const lastSentNoticeId = (await kv.get(LAST_NOTICE_ID_KEY)) || 0;

  if (latestNoticeId > lastSentNoticeId) {
    console.log(
      `[Notices] New notice found! ID: ${latestNoticeId}. Sending notifications...`
    );

    const result = await admin.messaging().sendEachForMulticast({
      tokens: optedInTokens,
      notification: {
        title: `📢 새 공지: ${latestNotice.Title}`,
        body: latestNotice.Content.split("\\n")[0],
      },
      webpush: {
        fcmOptions: { link: "/notice.html" },
        headers: { TTL: "86400" },
      },
    });

    await kv.set(LAST_NOTICE_ID_KEY, latestNoticeId);
    console.log(`[Notices] Sent ${result.successCount} new notice alerts.`);
    return result.successCount;
  }
  return 0;
}

// --- 메인 핸들러 ---
export default async function handler(req, res) {
  try {
    // 1. 딱 한 번만 모든 토큰 정보를 가져와 알림에 동의한 사용자만 필터링합니다.
    const allTokensData = await readTokensFromKV();
    const optedInTokens = allTokensData
      .filter((t) => t.alarmOptIn)
      .map((t) => t.token);

    if (optedInTokens.length === 0) {
      console.log(
        "No users opted in for any notifications. Cron job finished."
      );
      return res
        .status(200)
        .json({ success: true, message: "No opted-in users." });
    }

    // 2. Firebase Admin SDK 초기화
    ensureAdmin();

    // 3. 각 작업을 비동기적으로 동시에 실행합니다.
    const [noticeResult, eventResult] = await Promise.all([
      handleNoticeChecks(optedInTokens).catch((e) => {
        console.error("Error in handleNoticeChecks:", e);
        return 0;
      }),
      handleEventReminders(optedInTokens).catch((e) => {
        console.error("Error in handleEventReminders:", e);
        return 0;
      }),
    ]);

    res.status(200).json({
      success: true,
      sent_notices: noticeResult,
      sent_events: eventResult,
    });
  } catch (error) {
    console.error("[Unified Cron Job Error]", error);
    res.status(500).json({ error: error.message });
  }
}
