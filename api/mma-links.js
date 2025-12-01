import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  // [1] DB 키 변경 -> 기존에 등록된 유저 링크들 초기화됨 (v2)
  const KEY = "mma_event_links_v2";

  // [2] 퀴즈 설정 (보내주신 내용 적용 완료)
  const QUIZ_QUESTION =
    process.env.MMA_QUIZ_QUESTION || "깜고가 후진할 때 내는 소리는? ";
  const QUIZ_ANSWER = process.env.MMA_QUIZ_ANSWER || "루리루";

  try {
    // 1. 링크 조회 (GET)
    if (req.method === "GET") {
      const links = await kv.smembers(KEY);
      // 링크 목록과 함께 '현재 퀴즈 질문'도 클라이언트에 내려줍니다.
      return res.status(200).json({
        links: links || [],
        question: QUIZ_QUESTION,
      });
    }

    // 2. 링크 등록 (POST)
    else if (req.method === "POST") {
      let { link, answer } = req.body;

      // (1) 정답 검증
      if (!answer) {
        return res.status(400).json({ error: "퀴즈 정답을 입력해주세요." });
      }

      // 공백 제거, 콜론(:) 제거 후 비교 (예: "02:03" -> "0203")
      const cleanInput = String(answer).replace(/[\s:]/g, "").toLowerCase();
      const cleanAnswer = String(QUIZ_ANSWER)
        .replace(/[\s:]/g, "")
        .toLowerCase();

      if (cleanInput !== cleanAnswer) {
        return res.status(403).json({ error: "땡! 퀴즈 정답이 틀렸습니다." });
      }

      // (2) 링크 유효성 검사
      if (!link) return res.status(400).json({ error: "링크를 입력해주세요." });
      link = link.trim();

      if (
        !link.startsWith("https://go.kakaobank.io/") ||
        /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(link) ||
        /\s/.test(link)
      ) {
        return res.status(400).json({
          error:
            "유효하지 않은 링크입니다.\n불필요한 텍스트 없이 링크만 입력해주세요.",
        });
      }

      // (3) 중복 없이 저장
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
