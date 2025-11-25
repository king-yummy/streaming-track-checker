import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  const KEY = "mma_event_links";

  try {
    // 1. 링크 조회 (GET)
    if (req.method === "GET") {
      const links = await kv.smembers(KEY);
      return res.status(200).json({ links: links || [] });
    }

    // 2. 링크 등록 (POST)
    else if (req.method === "POST") {
      let { link } = req.body;

      if (!link) return res.status(400).json({ error: "링크를 입력해주세요." });

      // 공백 제거
      link = link.trim();

      // [필터링 핵심] 카카오뱅크 공식 도메인으로 시작하는지 엄격하게 검사
      if (!link.startsWith("https://go.kakaobank.io/")) {
        return res
          .status(400)
          .json({
            error:
              "올바른 카카오뱅크 이벤트 링크만 등록할 수 있습니다.\n(https://go.kakaobank.io/...)",
          });
      }

      // 중복 없이 저장 (Set)
      await kv.sadd(KEY, link);

      const count = await kv.scard(KEY);
      return res.status(200).json({ success: true, count });
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("MMA API Error:", error);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
}
