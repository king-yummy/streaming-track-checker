import { kv } from "@vercel/kv";

const TOKENS_KEY = "fcm-tokens";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { token } = req.query || {};
    if (!token) return res.status(400).json({ error: "Token required" });

    try {
      let settings = await kv.hget(TOKENS_KEY, token);
      if (typeof settings === "string") {
        try {
          settings = JSON.parse(settings);
        } catch {}
      }
      const alarmOptIn =
        settings && typeof settings === "object"
          ? !!settings.alarmOptIn
          : false;

      return res.status(200).json({ alarmOptIn });
    } catch (error) {
      console.error("[save-token GET] KV Error:", error);
      return res.status(500).json({ error: "Failed to fetch settings." });
    }
  }

  if (req.method === "POST") {
    const { token, alarmOptIn, noticeOptIn, calendarOptIn } = req.body || {};
    if (!token) return res.status(400).json({ error: "Token required" });

    try {
      let currentSettings = await kv.hget(TOKENS_KEY, token);
      if (typeof currentSettings === "string") {
        try {
          currentSettings = JSON.parse(currentSettings);
        } catch {}
      }
      currentSettings =
        currentSettings && typeof currentSettings === "object"
          ? currentSettings
          : {};

      const newSettings = {
        ...currentSettings,
        token,
        // alarmOptIn이 명시되면 우선, 아니면 과거 필드 호환
        alarmOptIn:
          typeof alarmOptIn === "boolean"
            ? alarmOptIn
            : typeof currentSettings.alarmOptIn === "boolean"
            ? currentSettings.alarmOptIn
            : !!(noticeOptIn ?? calendarOptIn),
      };

      // 구필드 정리(선택)
      delete newSettings.noticeOptIn;
      delete newSettings.calendarOptIn;

      await kv.hset(TOKENS_KEY, { [token]: JSON.stringify(newSettings) });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("[save-token POST] KV Error:", error);
      return res.status(500).json({ error: "Failed to save settings." });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
