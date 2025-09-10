import { kv } from "@vercel/kv";

const PARTICIPANTS_KEY = "superfan-participants";
const BOOSTER_COUNT_KEY = "superfan-booster-count";
const TOKENS_KEY = "fcm-tokens"; // 알림 설정이 저장되는 키

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: "FCM token is required." });
      }

      // [추가된 로직]
      // 토큰에 대한 알림 설정이 이미 있는지 확인합니다.
      const settingsExist = await kv.hexists(TOKENS_KEY, token);

      // 만약 설정이 없다면 (토큰이 새로 발급된 경우),
      // 알림을 켰던 사용자로 간주하고 기본 설정을 생성해줍니다.
      if (!settingsExist) {
        await kv.hset(TOKENS_KEY, {
          [token]: { token, alarmOptIn: true },
        });
      }
      // --- 로직 추가 끝 ---

      // 기존 로직: 참여자 추가 및 부스터 카운트 증가
      const [_, boosterCount] = await Promise.all([
        kv.sadd(PARTICIPANTS_KEY, token),
        kv.incr(BOOSTER_COUNT_KEY),
      ]);

      return res
        .status(200)
        .json({ success: true, newBoosterCount: boosterCount });
    } else if (req.method === "GET") {
      const [participantCount, boosterCount] = await Promise.all([
        kv.scard(PARTICIPANTS_KEY),
        kv.get(BOOSTER_COUNT_KEY),
      ]);

      return res.status(200).json({
        participants: participantCount || 0,
        boosterCount: boosterCount || 0,
      });
    } else {
      res.setHeader("Allow", ["GET", "POST"]);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error("Superfan Stats API Error:", error);
    return res.status(500).json({ error: "서버 내부 오류가 발생했습니다." });
  }
}
