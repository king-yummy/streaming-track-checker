// api/notices.js (v2 - 푸시 알림 기능)

import { kv } from "@vercel/kv";
// --- (추가) v2: 푸시 알림을 위한 모듈 ---
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import os from "os";
// ------------------------------------

// --- (추가) v2: api/push-test.js에서 가져온 헬퍼 함수 ---
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

export default async function handler(request, response) {
  const { method } = request;

  try {
    switch (method) {
      // 공지사항 조회 (GET)
      case "GET":
        const noticeHash = await kv.hgetall("notices");
        let notices = noticeHash ? Object.values(noticeHash) : [];
        notices.sort((a, b) => new Date(b.date) - new Date(a.date));
        return response.status(200).json(notices);

      // 공지사항 추가 (POST)
      case "POST": {
        // (수정) v2: case를 블록으로 감싸기
        // (수정) v2: sendPush 값 받기
        const { title, content, date, sendPush } = request.body;
        if (!title || !content || !date) {
          return response
            .status(400)
            .json({ error: "Title, content, and date are required." });
        }

        const newNotice = {
          id: `noti_${Date.now()}`,
          title,
          content,
          date,
        };
        await kv.hset("notices", { [newNotice.id]: newNotice });

        let pushResult = null;
        // (추가) v2: 푸시 알림 전송 로직
        if (sendPush) {
          try {
            ensureAdmin();
            const tokens = readTokens();
            // 'notice' 수신 동의한 유저만 필터링
            const targets = tokens
              .filter((t) => t.noticeOptIn)
              .map((t) => t.token);

            if (targets.length > 0) {
              const result = await admin.messaging().sendEachForMulticast({
                tokens: targets,
                notification: {
                  title: title, // 새 공지 제목
                  body: content, // 새 공지 내용
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
            pushResult = { sent: 0, failed: -1, error: e.message }; // 푸시 실패 기록
          }
        }
        // (수정) v2: 푸시 결과를 포함하여 응답
        return response
          .status(200)
          .json({ success: true, notice: newNotice, push: pushResult });
      }

      // 공지사항 수정 (PUT)
      case "PUT": {
        // (수정) v2: case를 블록으로 감싸기
        const {
          id: idToUpdate,
          title: updatedTitle,
          content: updatedContent,
          date: updatedDate,
          sendPush, // (추가) v2: sendPush 값 받기
        } = request.body;

        if (!idToUpdate || !updatedTitle || !updatedContent || !updatedDate) {
          return response
            .status(400)
            .json({
              error: "ID, title, content, and date are required for update.",
            });
        }

        const updatedNotice = {
          id: idToUpdate,
          title: updatedTitle,
          content: updatedContent,
          date: updatedDate,
        };
        await kv.hset("notices", { [idToUpdate]: updatedNotice });

        let pushResult = null;
        // (추가) v2: 푸시 알림 전송 로직 (수정)
        if (sendPush) {
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
                  title: `📢 [수정] ${updatedTitle}`, // (수정) v2: 수정 알림
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

      // 공지사항 삭제 (DELETE)
      case "DELETE": {
        const { id: idToDelete } = request.body;
        if (!idToDelete) {
          return response.status(400).json({ error: "Notice ID is required." });
        }
        await kv.hdel("notices", idToToDelete); // (실수) 변수명 수정
        await kv.hdel("notices", idToDelete); // ◀◀◀ (수정) 올바른 변수명
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
