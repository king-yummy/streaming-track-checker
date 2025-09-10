import { kv } from "@vercel/kv";

const TOKENS_KEY = "fcm-tokens";
const PARTICIPANTS_KEY = "superfan-participants";
const BOOSTER_COUNT_KEY = "superfan-booster-count";

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const { token } = req.body || {};
      if (!token) return res.status(400).json({ error: "Token required" });

      // 토큰 설정 미존재 시 기본 ON으로 초기화 (문자열 JSON)
      const exists = await kv.hexists(TOKENS_KEY, token);
      if (!exists) {
        const settings = JSON.stringify({ token, alarmOptIn: true });
        await kv.hset(TOKENS_KEY, { [token]: settings });
      }

      // 참여자 추가 & 부스터 카운트 증가
      const [, boosterCount] = await Promise.all([
        kv.sadd(PARTICIPANTS_KEY, token),
        kv.incr(BOOSTER_COUNT_KEY),
      ]);

      return res
        .status(200)
        .json({ success: true, newBoosterCount: boosterCount });
    }

    if (req.method === "GET") {
      const [participants, boosterCount] = await Promise.all([
        kv.scard(PARTICIPANTS_KEY),
        kv.get(BOOSTER_COUNT_KEY),
      ]);
      return res.status(200).json({
        participants: participants || 0,
        boosterCount: boosterCount || 0,
      });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error("[superfan-stats] Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
