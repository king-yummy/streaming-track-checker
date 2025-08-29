// api/save-token.js

import { kv } from "@vercel/kv";

const TOKENS_KEY = "fcm-tokens"; // Vercel KV에서 사용할 키

export default async function handler(req, res) {
  // GET 요청: 특정 토큰의 현재 설정 값을 반환
  if (req.method === "GET") {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "Token required" });

    try {
      const settings = await kv.hget(TOKENS_KEY, token);
      return res.status(200).json({
        noticeOptIn: settings?.noticeOptIn || false,
        calendarOptIn: settings?.calendarOptIn || false,
      });
    } catch (error) {
      console.error("[save-token GET] KV Error:", error);
      return res.status(500).json({ error: "Failed to fetch settings." });
    }
  }

  // POST 요청: 토큰과 설정 값을 저장하거나 업데이트
  if (req.method === "POST") {
    const { token, noticeOptIn, calendarOptIn } = req.body;
    if (!token) return res.status(400).json({ error: "Token required" });

    try {
      const currentSettings = (await kv.hget(TOKENS_KEY, token)) || {};

      const newSettings = {
        ...currentSettings,
        token, // 토큰 정보도 함께 저장
        noticeOptIn: noticeOptIn,
        calendarOptIn: calendarOptIn,
      };

      await kv.hset(TOKENS_KEY, { [token]: newSettings });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("[save-token POST] KV Error:", error);
      return res.status(500).json({ error: "Failed to save settings." });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
