export default async function handler(req, res) {
  // 서버는 POST 요청만 받습니다.
  if (req.method !== "POST") {
    return res.status(405).json({ message: "허용되지 않은 요청 방식입니다." });
  }

  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: "이름이 입력되지 않았습니다." });
  }

  try {
    // --- 1. Vercel 환경 변수에서 기밀 정보 가져오기 ---
    const pwDataString = process.env.PASSWORD_DATA;
    const userListString = process.env.USER_LIST;

    // 환경 변수가 설정되었는지 확인
    if (!pwDataString || !userListString) {
      console.error(
        "서버 환경 변수(PASSWORD_DATA 또는 USER_LIST)가 설정되지 않았습니다."
      );
      return res.status(500).json({ message: "서버 설정에 오류가 있습니다." });
    }

    // 문자열을 JSON 객체로 변환 (앞뒤 공백/BOM 제거 포함)
    const allPasswords = JSON.parse(pwDataString.trim());
    const validUsers = JSON.parse(userListString.trim());

    // --- 2. 사용자 유효성 검사 ---
    if (!validUsers.includes(name)) {
      return res.status(403).json({ message: "등록되지 않은 사용자입니다." });
    }

    // --- 3. 현재 시간에 맞는 비밀번호 찾기 ---
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const hour = now.getHours().toString().padStart(2, "0");
    const minute = now.getMinutes();
    const timeSlot = minute < 30 ? `${hour}:00` : `${hour}:30`;

    const passwordForToday = allPasswords[date];
    const finalPassword = passwordForToday ? passwordForToday[timeSlot] : null;

    if (!finalPassword) {
      return res
        .status(404)
        .json({ message: "현재 시간에 해당하는 비밀번호가 없습니다." });
    }

    // --- 4. 성공 응답: 비밀번호 전송 ---
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
