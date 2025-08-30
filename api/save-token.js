// /api/save-token.js

import { kv } from "@vercel/kv";

const TOKENS_KEY = "fcm-tokens";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "Token required" });

    try {
      const settings = await kv.hget(TOKENS_KEY, token);
      return res.status(200).json({
        alarmOptIn: settings?.alarmOptIn || false, // 단일 값으로 반환
      });
    } catch (error) {
      console.error("[save-token GET] KV Error:", error);
      return res.status(500).json({ error: "Failed to fetch settings." });
    }
  }

  if (req.method === "POST") {
    const { token, alarmOptIn } = req.body; // 단일 값으로 받음
    if (!token) return res.status(400).json({ error: "Token required" });

    try {
      const currentSettings = (await kv.hget(TOKENS_KEY, token)) || {};
      const newSettings = {
        ...currentSettings,
        token,
        alarmOptIn: alarmOptIn, // 단일 값으로 저장
      };

      // 불필요해진 이전 키는 삭제 (선택적)
      delete newSettings.noticeOptIn;
      delete newSettings.calendarOptIn;

      await kv.hset(TOKENS_KEY, { [token]: newSettings });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("[save-token POST] KV Error:", error);
      return res.status(500).json({ error: "Failed to save settings." });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
