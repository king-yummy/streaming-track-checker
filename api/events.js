// api/events.js (GET 부분 수정 완료)
import { kv } from "@vercel/kv";

export default async function handler(request, response) {
  const { method } = request;

  try {
    switch (method) {
      // 일정 조회 (GET)
      case "GET":
        const eventHash = await kv.hgetall("events");
        let events = eventHash
          ? Object.values(eventHash)
              .map((eventString) => {
                // ▼▼▼ JSON 문자열을 객체로 변환 ▼▼▼
                try {
                  return JSON.parse(eventString);
                } catch (e) {
                  console.error("Failed to parse event JSON:", eventString, e);
                  return null; // 파싱 실패 시 null 반환
                }
              })
              .filter(Boolean) // null 값 제거
          : [];

        // 시작 시간을 기준으로 오름차순 정렬 (이제 객체 상태이므로 a.start 접근 가능)
        events.sort((a, b) => new Date(a.start) - new Date(b.start));

        return response.status(200).json(events); // <-- 변환된 객체 배열 반환

      // 일정 추가 (POST) - 이전 수정 사항 유지
      case "POST":
        const { title, date, startTime, endDate, endTime } = request.body;
        if (!title || !date || !startTime) {
          return response
            .status(400)
            .json({ error: "Title, date, and start time are required." });
        }
        const newEvent = {
          id: `evt_${Date.now()}`,
          title,
          start: `${date}T${startTime}`,
          end:
            endDate && endTime
              ? `${endDate}T${endTime}`
              : `${date}T${startTime}`, // 종료 시간 없으면 시작 시간과 동일하게
        };
        // ▼▼▼ 저장 시 JSON 문자열로 변환 ▼▼▼
        await kv.hset("events", { [newEvent.id]: JSON.stringify(newEvent) });
        return response.status(200).json({ success: true, event: newEvent });

      // 일정 수정 (PUT) - 이전 수정 사항 유지
      case "PUT":
        const {
          id: idToUpdate,
          title: updatedTitle,
          start: updatedStart,
          end: updatedEnd,
        } = request.body;
        if (!idToUpdate || !updatedTitle || !updatedStart) {
          return response.status(400).json({
            error: "ID, title, and start time are required for update.",
          });
        }
        // ▼▼▼ 종료 시간이 null 또는 빈 문자열로 오면 시작 시간으로 대체 ▼▼▼
        const finalEnd = updatedEnd || updatedStart;
        const updatedEvent = {
          id: idToUpdate,
          title: updatedTitle,
          start: updatedStart,
          end: finalEnd, // 수정 시에도 종료 시간 보장
        };
        // ▼▼▼ 저장 시 JSON 문자열로 변환 ▼▼▼
        await kv.hset("events", { [idToUpdate]: JSON.stringify(updatedEvent) });
        return response
          .status(200)
          .json({ success: true, event: updatedEvent });

      // 일정 삭제 (DELETE)
      case "DELETE":
        const { id: idToDelete } = request.body;
        if (!idToDelete) {
          return response.status(400).json({ error: "Event ID is required." });
        }
        await kv.hdel("events", idToDelete); // <-- hdel 사용
        return response.status(200).json({ success: true });

      default:
        response.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]); // PUT 추가
        return response.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error("API Error:", error);
    return response
      .status(500)
      .json({ error: "An internal server error occurred." });
  }
}
