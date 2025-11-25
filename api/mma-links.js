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

      link = link.trim();

      // [서버측 엄격 필터링]
      // 1. https://go.kakaobank.io/ 로 시작하지 않거나
      // 2. 한글이 포함되어 있거나
      // 3. 공백이 포함되어 있으면 차단
      if (
        !link.startsWith("https://go.kakaobank.io/") ||
        /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(link) ||
        /\s/.test(link)
      ) {
        return res
          .status(400)
          .json({
            error:
              "유효하지 않은 링크입니다.\n불필요한 텍스트 없이 링크만 입력해주세요.",
          });
      }

      // 중복 없이 저장
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
