// api/notices.js (fixed version)

import { kv } from "@vercel/kv";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import os from "os";

// --- local/tmp token storage ---
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

// --- firebase admin ---
function ensureAdmin() {
  if (!admin.apps.length) {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!json) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON not set");
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(json)),
    });
  }
}

// --- 날짜 생성 함수 (KST) ---
function getKSTDateString() {
  const nowKST = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })
  );
  return (
    nowKST.getFullYear() +
    "-" +
    String(nowKST.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(nowKST.getDate()).padStart(2, "0")
  );
}

// --- KV + file 토큰 통합 가져오기 ---
async function getAllTokens() {
  const fileTokens = readTokens();

  const kvTokensHash = await kv.hgetall("fcm_tokens");
  const kvTokens = kvTokensHash ? Object.values(kvTokensHash) : [];

  return [...fileTokens, ...kvTokens];
}

// ----------------------------------------------------

export default async function handler(request, response) {
  const { method } = request;

  try {
    switch (method) {
      case "GET": {
        const noticeHash = await kv.hgetall("notices");
        let notices = noticeHash ? Object.values(noticeHash) : [];

        // createdAt → id timestamp fallback → date 순
        notices.sort((a, b) => {
          const aTime = a.createdAt || parseInt((a.id || "").split("_")[1], 10);
          const bTime = b.createdAt || parseInt((b.id || "").split("_")[1], 10);
          return bTime - aTime;
        });

        return response.status(200).json(notices);
      }

      case "POST": {
        const { title, content, sendPush } = request.body;

        if (!title || !content) {
          return response
            .status(400)
            .json({ error: "Title and content are required." });
        }

        const timestamp = Date.now();

        const newNotice = {
          id: `noti_${timestamp}`,
          title,
          content,
          date: getKSTDateString(),
          createdAt: timestamp,
        };

        await kv.hset("notices", { [newNotice.id]: newNotice });

        let pushResult = null;

        if (sendPush) {
          try {
            ensureAdmin();

            const tokens = await getAllTokens();
            const targets = tokens
              .filter((t) => t.noticeOptIn)
              .map((t) => t.token);

            if (targets.length > 0) {
              const result = await admin.messaging().sendEachForMulticast({
                tokens: targets,
                notification: { title, body: content },
              });
              pushResult = {
                sent: result.successCount,
                failed: result.failureCount,
              };
            } else {
              pushResult = { sent: 0, failed: 0, note: "no opt-in tokens" };
            }
          } catch (e) {
            pushResult = { sent: 0, failed: -1, error: e.message };
          }
        }

        return response.status(200).json({
          success: true,
          notice: newNotice,
          push: pushResult,
        });
      }

      case "PUT": {
        const { id: noticeId, title, content, sendPush } = request.body;

        if (!noticeId || !title || !content) {
          return response
            .status(400)
            .json({ error: "ID, title, and content are required." });
        }

        const original = await kv.hget("notices", noticeId);
        if (!original) {
          return response.status(404).json({ error: "Notice not found." });
        }

        const updated = {
          id: noticeId,
          title,
          content,
          date: original.date,
          createdAt: original.createdAt,
        };

        await kv.hset("notices", { [noticeId]: updated });

        let pushResult = null;

        if (sendPush) {
          try {
            ensureAdmin();

            const tokens = await getAllTokens();
            const targets = tokens
              .filter((t) => t.noticeOptIn)
              .map((t) => t.token);

            if (targets.length > 0) {
              const result = await admin.messaging().sendEachForMulticast({
                tokens: targets,
                notification: {
                  title: `📢 [수정] ${title}`,
                  body: content,
                },
              });

              pushResult = {
                sent: result.successCount,
                failed: result.failureCount,
              };
            } else {
              pushResult = { sent: 0, failed: 0, note: "no opt-in tokens" };
            }
          } catch (e) {
            pushResult = { sent: 0, failed: -1, error: e.message };
          }
        }

        return response.status(200).json({
          success: true,
          notice: updated,
          push: pushResult,
        });
      }

      case "DELETE": {
        const { id } = request.body;
        if (!id) {
          return response.status(400).json({ error: "Notice ID is required." });
        }
        await kv.hdel("notices", id);
        return response.status(200).json({ success: true });
      }

      default:
        response.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
        return response.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error("API Error:", error);
    return response
      .status(500)
      .json({ error: "An internal server error occurred." });
  }
}
