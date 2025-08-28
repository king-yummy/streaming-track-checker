import { kv } from "@vercel/kv";

// Vercel KV에서 사용할 키 이름
const SUPERFAN_LINKS_KEY = "superfan-links";

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      // 링크 등록 API
      const { url } = req.body;

      if (!url || !url.startsWith("http")) {
        return res.status(400).json({ error: "유효한 URL을 입력해주세요." });
      }

      // 알려주신 링크 형식에 맞게 검증 로직 수정
      if (!url.includes("mnetplus.world")) {
        return res
          .status(400)
          .json({ error: "Mnet Plus 링크가 아닌 것 같아요." });
      }

      const isMember = await kv.sismember(SUPERFAN_LINKS_KEY, url);
      if (isMember) {
        return res
          .status(200)
          .json({ message: "이미 등록된 링크입니다.", url });
      }

      await kv.sadd(SUPERFAN_LINKS_KEY, url);
      return res.status(201).json({ success: true, url });
    } else if (req.method === "GET") {
      // 등록된 모든 링크 목록 가져오기 API
      const links = await kv.smembers(SUPERFAN_LINKS_KEY);
      return res.status(200).json(links || []);
    } else {
      // 허용되지 않은 메소드
      res.setHeader("Allow", ["GET", "POST"]);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error("Superfan API Error:", error);
    return res.status(500).json({ error: "서버 내부 오류가 발생했습니다." });
  }
}
