// api/events.js

import { kv } from "@vercel/kv";

export default async function handler(request, response) {
  const { method } = request;

  try {
    switch (method) {
      // 일정 조회 (GET)
      case "GET":
        const eventHash = await kv.hgetall("events");
        let events = eventHash ? Object.values(eventHash) : [];

        // 시작 시간을 기준으로 오름차순 정렬
        events.sort((a, b) => new Date(a.start) - new Date(b.start));

        return response.status(200).json(events);

      // 일정 추가 (POST)
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
          end: endDate && endTime ? `${endDate}T${endTime}` : null,
        };
        await kv.hset("events", { [newEvent.id]: newEvent });
        return response.status(200).json({ success: true, event: newEvent });

      // [수정] 일정 수정 로직 (PUT) 추가
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
        const updatedEvent = {
          id: idToUpdate,
          title: updatedTitle,
          start: updatedStart,
          end: updatedEnd,
        };
        await kv.hset("events", { [idToUpdate]: updatedEvent });
        return response
          .status(200)
          .json({ success: true, event: updatedEvent });

      // 일정 삭제 (DELETE)
      case "DELETE":
        const { id: idToDelete } = request.body;
        if (!idToDelete) {
          return response.status(400).json({ error: "Event ID is required." });
        }
        await kv.hdel("events", idToDelete);
        return response.status(200).json({ success: true });

      default:
        response.setHeader("Allow", ["GET", "POST", "DELETE"]);
        return response.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error("API Error:", error);
    return response
      .status(500)
      .json({ error: "An internal server error occurred." });
  }
}
