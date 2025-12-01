import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  // [1] 데이터베이스 키 변경 (이름을 바꿔서 기존 데이터를 초기화 효과)
  const KEY = "mma_event_links_v2";

  // [2] 퀴즈 설정 (여기서 언제든 질문과 정답을 바꾸세요)
  // 환경변수(process.env)를 사용하거나 아래 문자열을 직접 수정하면 됩니다.
  const QUIZ_QUESTION =
    process.env.MMA_QUIZ_QUESTION ||
    "최근에 키우던 식물이 죽은 멤버가 11월 26일에 처음으로 버블 보낸 시간은? HH:MM (정답: HHMM 4자리 숫자)";
  const QUIZ_ANSWER = process.env.MMA_QUIZ_ANSWER || "0203";

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

      // 공백 제거 및 소문자 변환 후 비교 (대소문자 구분 없이, 띄어쓰기 무시)
      const cleanInput = String(answer).replace(/\s+/g, "").toLowerCase();
      const cleanAnswer = String(QUIZ_ANSWER).replace(/\s+/g, "").toLowerCase();

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
