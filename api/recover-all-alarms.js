// /api/recover-all-alarms.js
import { kv } from "@vercel/kv";

const TOKENS_KEY = "fcm-tokens";

export default async function handler(req, res) {
  // 무단 실행을 방지하기 위한 비밀 키 확인
  if (
    req.method !== "POST" ||
    req.headers["x-recovery-key"] !== process.env.RECOVERY_KEY
  ) {
    return res.status(403).json({ error: "Unauthorized." });
  }

  try {
    console.log("전체 사용자 대상 알림 설정 복구 작업을 시작합니다...");

    // 1. 데이터베이스에 저장된 모든 토큰과 설정을 가져옵니다.
    const allTokenSettings = await kv.hgetall(TOKENS_KEY);
    if (!allTokenSettings) {
      return res
        .status(200)
        .json({ message: "복구할 사용자 데이터가 없습니다." });
    }

    const allTokens = Object.keys(allTokenSettings);
    console.log(
      `총 ${allTokens.length}명의 사용자를 대상으로 복구를 시작합니다.`
    );

    const updates = {};
    let recoveredCount = 0;

    // 2. 모든 토큰을 순회하며 'alarmOptIn' 값을 'true'로 설정합니다.
    for (const token of allTokens) {
      const currentSettings = allTokenSettings[token] || {};

      // 알림 설정이 명시적으로 'true'가 아닌 경우에만 업데이트 목록에 추가합니다.
      if (currentSettings.alarmOptIn !== true) {
        updates[token] = { ...currentSettings, token, alarmOptIn: true };
        recoveredCount++;
      }
    }

    if (Object.keys(updates).length > 0) {
      // 3. 변경이 필요한 모든 설정을 한 번에 업데이트합니다.
      await kv.hset(TOKENS_KEY, updates);
      const message = `✅ 작업 완료! 총 ${recoveredCount}명의 사용자 알림 설정이 'ON'으로 복구되었습니다.`;
      console.log(message);
      return res.status(200).json({ success: true, message });
    } else {
      const message =
        "✅ 모든 사용자의 알림 설정이 이미 'ON' 상태입니다. 추가 작업이 필요 없습니다.";
      console.log(message);
      return res.status(200).json({ success: true, message });
    }
  } catch (error) {
    console.error("전체 알림 복구 중 오류 발생:", error);
    return res.status(500).json({ error: "서버 내부 오류가 발생했습니다." });
  }
}
