import { kv } from "@vercel/kv";

const PARTICIPANTS_KEY = "superfan-participants";
const BOOSTER_COUNT_KEY = "superfan-booster-count";

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: "FCM token is required." });
      }

      // 동시에 두 가지 작업을 처리합니다.
      const [_, boosterCount] = await Promise.all([
        kv.sadd(PARTICIPANTS_KEY, token), // 참여자 추가
        kv.incr(BOOSTER_COUNT_KEY), // 부스터 카운트 1 증가
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
