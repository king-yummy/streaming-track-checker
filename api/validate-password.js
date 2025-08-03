export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "허용되지 않은 요청 방식입니다." });
  }

  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: "이름이 입력되지 않았습니다." });
  }

  try {
    // --- 환경 변수에서 기밀 정보 가져오기 ---
    const pwDataString = process.env.PASSWORD_DATA;
    const userListString = process.env.USER_LIST;

    if (!pwDataString || !userListString) {
      console.error(
        "서버 환경 변수(PASSWORD_DATA 또는 USER_LIST)가 설정되지 않았습니다."
      );
      return res.status(500).json({ message: "서버 설정에 오류가 있습니다." });
    }

    const allPasswords = JSON.parse(pwDataString.trim());
    const validUsers = JSON.parse(userListString.trim());

    // --- 사용자 유효성 검사 ---
    if (!validUsers.includes(name)) {
      return res.status(403).json({ message: "등록되지 않은 사용자입니다." });
    }

    // --- ✨ [핵심 수정] UTC를 한국 시간(KST)으로 변환 ---
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000; // 9시간 차이 (밀리초)
    const kstTime = new Date(now.getTime() + kstOffset);

    // KST 기준으로 날짜와 시간 추출
    const date = kstTime.toISOString().slice(0, 10);
    const hour = kstTime.getUTCHours().toString().padStart(2, "0");
    const minute = kstTime.getUTCMinutes();
    const timeSlot = minute < 30 ? `${hour}:00` : `${hour}:30`;
    // --- ✨ 수정 끝 ---

    const passwordForToday = allPasswords[date];
    const finalPassword = passwordForToday ? passwordForToday[timeSlot] : null;

    if (!finalPassword) {
      return res
        .status(404)
        .json({ message: "현재 시간에 해당하는 비밀번호가 없습니다." });
    }

    return res.status(200).json({ password: finalPassword });
  } catch (error) {
    console.error("비밀번호 발급 API 오류:", error);
    return res
      .status(500)
      .json({
        message: "서버 내부 오류가 발생했습니다. 관리자에게 문의하세요.",
      });
  }
}
