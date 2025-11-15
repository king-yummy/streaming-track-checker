// api/notices.js (v2.3 - KST 날짜 자동 생성)

import { kv } from "@vercel/kv";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import os from "os";

// --- 푸시 알림 헬퍼 함수 (v2.2와 동일) ---
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
// ----------------------------------------------------

// --- (추가) v2.3: KST 날짜 생성 헬퍼 함수 ---
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
// ----------------------------------------------------

export default async function handler(request, response) {
  const { method } = request;

  try {
    switch (method) {
      // (GET은 v2.2와 동일)
      case "GET":
        const noticeHash = await kv.hgetall("notices");
        let notices = noticeHash ? Object.values(noticeHash) : [];
        notices.sort((a, b) => new Date(b.date) - new Date(a.date));
        return response.status(200).json(notices);

      // (POST 수정) v2.3: 날짜 자동 생성
      case "POST": {
        const { title, content, sendPush } = request.body; // 'date' 제거
        if (!title || !content) {
          // 'date' 제거
          return response
            .status(400)
            .json({ error: "Title and content are required." }); // 'date' 제거
        }

        const newNotice = {
          id: `noti_${Date.now()}`,
          title,
          content,
          date: getKSTDateString(), // 👈 (수정) v2.3: KST 날짜 자동 생성
        };
        await kv.hset("notices", { [newNotice.id]: newNotice });

        let pushResult = null;
        if (sendPush) {
          // ... (푸시 로직은 v2.2와 동일) ...
          try {
            ensureAdmin();
            const tokens = readTokens();
            const targets = tokens
              .filter((t) => t.noticeOptIn)
              .map((t) => t.token);
            if (targets.length > 0) {
              const result = await admin.messaging().sendEachForMulticast({
                tokens: targets,
                notification: { title: title, body: content },
              });
              pushResult = {
                sent: result.successCount,
                failed: result.failureCount,
              };
            } else {
              pushResult = { sent: 0, failed: 0, note: "no opt-in tokens" };
            }
          } catch (e) {
            console.error("[Notice Push Error]", e.message);
            pushResult = { sent: 0, failed: -1, error: e.message };
          }
        }
        return response
          .status(200)
          .json({ success: true, notice: newNotice, push: pushResult });
      }

      // (PUT 수정) v2.3: 기존 날짜 유지
      case "PUT": {
        const {
          id: idToUpdate,
          title: updatedTitle,
          content: updatedContent,
          // date: updatedDate, // (삭제) v2.3
          sendPush,
        } = request.body;

        if (!idToUpdate || !updatedTitle || !updatedContent) {
          // 'date' 제거
          return response
            .status(400)
            .json({ error: "ID, title, and content are required for update." }); // 'date' 제거
        }

        // (수정) v2.3: 기존 공지사항의 날짜를 보존하기 위해 원본 조회
        const originalNotice = await kv.hget("notices", idToUpdate);
        if (!originalNotice) {
          return response.status(404).json({ error: "Notice not found." });
        }

        const updatedNotice = {
          id: idToUpdate,
          title: updatedTitle,
          content: updatedContent,
          date: originalNotice.date, // 👈 (수정) v2.3: 원본 날짜 사용
        };
        await kv.hset("notices", { [idToUpdate]: updatedNotice });

        let pushResult = null;
        if (sendPush) {
          // ... (푸시 로직은 v2.2와 동일) ...
          try {
            ensureAdmin();
            const tokens = readTokens();
            const targets = tokens
              .filter((t) => t.noticeOptIn)
              .map((t) => t.token);
            if (targets.length > 0) {
              const result = await admin.messaging().sendEachForMulticast({
                tokens: targets,
                notification: {
                  title: `📢 [수정] ${updatedTitle}`,
                  body: updatedContent,
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
            console.error("[Notice Push Error]", e.message);
            pushResult = { sent: 0, failed: -1, error: e.message };
          }
        }

        return response
          .status(200)
          .json({ success: true, notice: updatedNotice, push: pushResult });
      }

      // (DELETE는 v2.2와 동일)
      case "DELETE": {
        const { id: idToDelete } = request.body;
        if (!idToDelete) {
          return response.status(400).json({ error: "Notice ID is required." });
        }
        await kv.hdel("notices", idToDelete);
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
