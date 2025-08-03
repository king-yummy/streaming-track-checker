import { kv } from '@vercel/kv'; // Vercel KV를 사용하기 위해 import

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '허용되지 않은 요청 방식입니다.' });
  }

  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: '이름이 입력되지 않았습니다.' });
  }

  try {
    // --- 환경 변수에서 기밀 정보 가져오기 ---
    const pwDataString = process.env.PASSWORD_DATA;
    const userListString = process.env.USER_LIST;

    if (!pwDataString || !userListString) {
      console.error('서버 환경 변수(PASSWORD_DATA 또는 USER_LIST)가 설정되지 않았습니다.');
      return res.status(500).json({ message: '서버 설정에 오류가 있습니다.' });
    }

    const allPasswords = JSON.parse(pwDataString.trim());
    const validUsers = JSON.parse(userListString.trim());

    // --- 사용자 유효성 검사 ---
    if (!validUsers.includes(name)) {
      return res.status(403).json({ message: '등록되지 않은 사용자입니다.' });
    }

    // --- UTC를 한국 시간(KST)으로 변환 ---
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstTime = new Date(now.getTime() + kstOffset);

    const date = kstTime.toISOString().slice(0, 10);
    const hour = kstTime.getUTCHours().toString().padStart(2, '0');
    const minute = kstTime.getUTCMinutes();
    const timeSlot = minute < 30 ? `${hour}:00` : `${hour}:30`;

    const passwordForToday = allPasswords[date];
    const finalPassword = passwordForToday ? passwordForToday[timeSlot] : null;

    if (!finalPassword) {
      return res.status(404).json({ message: `현재 시간(${date} ${hour}:${minute})에 해당하는 비밀번호가 없습니다.` });
    }

    // --- ✨ [추가된 부분] 구글 시트가 아닌 Vercel KV에 로그 기록 ---
    try {
      const logKey = `logs:${date}`;
      const newLog = { name, timestamp: new Date().toISOString() };
      await kv.rpush(logKey, JSON.stringify(newLog)); // Vercel KV의 리스트에 로그 추가
    } catch (logError) {
      console.error('로그 기록 중 오류 발생:', logError);
      // 로그 기록에 실패해도 비밀번호 발급은 계속 진행합니다.
    }
    // --- ✨ 추가 끝 ---

    return res.status(200).json({ password: finalPassword });

  } catch (error) {
    console.error('비밀번호 발급 API 오류:', error);
    return res.status(500).json({ message: '서버 내부 오류가 발생했습니다. 관리자에게 문의하세요.' });
  }
}