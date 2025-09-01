// /api/get-token-stats.js

import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  try {
    // 'fcm-tokens' 해시의 모든 데이터를 가져옵니다.
    const allTokensData = await kv.hgetall("fcm-tokens");

    if (!allTokensData) {
      return res.status(200).json({ total: 0, optIn: 0, optOut: 0, note: "No token data found." });
    }

    const tokens = Object.values(allTokensData);
    const total = tokens.length;

    // alarmOptIn이 true인 사용자 수를 계산합니다.
    const optIn = tokens.filter(t => t && t.alarmOptIn === true).length;

    // 알람 끈 사용자 = 전체 - 알람 켠 사용자
    const optOut = total - optIn;

    return res.status(200).json({
      "전체 토큰 수": total,
      "알람 켠 사람": optIn,
      "알람 끈 사람": optOut,
    });

  } catch (error) {
    console.error("Failed to get token stats:", error);
    return res.status(500).json({ error: "Failed to fetch stats." });
  }
}