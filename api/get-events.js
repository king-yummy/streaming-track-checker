// api/get-events.js
import { kv } from "@vercel/kv";

export default async function handler(request, response) {
  try {
    // 'events'라는 키로 저장된 모든 일정을 가져옵니다.
    const events = await kv.lrange("events", 0, -1);
    return response.status(200).json(events);
  } catch (error) {
    return response.status(500).json({ error: "Failed to fetch events." });
  }
}
