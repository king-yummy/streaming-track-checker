// api/reset-events.js

import { kv } from "@vercel/kv";

export default async function handler(request, response) {
  try {
    console.log("!!! 이벤트 데이터베이스를 완전히 초기화합니다...");

    // 'events' 라는 키를 데이터베이스에서 삭제
    await kv.del("events");

    const message =
      "✅ 이벤트 데이터베이스가 성공적으로 초기화되었습니다. 이제 캘린더를 새로고침해서 사용하세요.";
    console.log(message);
    return response.status(200).send(message);
  } catch (error) {
    console.error("데이터 초기화 중 심각한 오류 발생:", error);
    return response
      .status(500)
      .json({ error: "초기화에 실패했습니다. 서버 로그를 확인하세요." });
  }
}
