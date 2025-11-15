// api/notices.js

import { kv } from "@vercel/kv";

export default async function handler(request, response) {
  const { method } = request;

  try {
    switch (method) {
      // 공지사항 조회 (GET)
      case "GET":
        const noticeHash = await kv.hgetall("notices"); // ◀◀ 수정 (eventHash -> noticeHash)
        let notices = noticeHash ? Object.values(noticeHash) : [];

        // 날짜(Date)를 기준으로 내림차순 정렬 (최신 공지가 위로) ◀◀ 수정
        notices.sort((a, b) => new Date(b.date) - new Date(a.date));

        return response.status(200).json(notices);

      // 공지사항 추가 (POST)
      case "POST":
        // 공지사항에 필요한 title, content, date를 받습니다. ◀◀ 수정
        const { title, content, date } = request.body;
        if (!title || !content || !date) {
          // ◀◀ 수정
          return response
            .status(400)
            .json({ error: "Title, content, and date are required." }); // ◀◀ 수정
        }
        const newNotice = {
          // ◀◀ 수정 (newEvent -> newNotice)
          id: `noti_${Date.now()}`, // ◀◀ 수정 (evt_ -> noti_)
          title,
          content, // ◀◀ 수정
          date, // ◀◀ 수정
          // 'start', 'end' 필드 제거
        };
        await kv.hset("notices", { [newNotice.id]: newNotice });
        return response.status(200).json({ success: true, notice: newNotice }); // ◀◀ 수정

      // 공지사항 수정 (PUT)
      case "PUT":
        const {
          id: idToUpdate,
          title: updatedTitle,
          content: updatedContent, // ◀◀ 수정
          date: updatedDate, // ◀◀ 수정
        } = request.body;

        if (!idToUpdate || !updatedTitle || !updatedContent || !updatedDate) {
          // ◀◀ 수정
          return response.status(400).json({
            error: "ID, title, content, and date are required for update.", // ◀◀ 수정
          });
        }
        const updatedNotice = {
          // ◀◀ 수정
          id: idToUpdate,
          title: updatedTitle,
          content: updatedContent, // ◀◀ 수정
          date: updatedDate, // ◀◀ 수정
        };
        await kv.hset("notices", { [idToUpdate]: updatedNotice });
        return response
          .status(200)
          .json({ success: true, notice: updatedNotice }); // ◀◀ 수정

      // 공지사항 삭제 (DELETE)
      // 이 부분은 'id'만 필요하므로 기존 코드와 동일하게 잘 작동합니다.
      case "DELETE":
        const { id: idToDelete } = request.body;
        if (!idToDelete) {
          return response.status(400).json({ error: "Notice ID is required." }); // (Event -> Notice)
        }
        await kv.hdel("notices", idToDelete);
        return response.status(200).json({ success: true });

      default:
        // PUT 메서드도 허용 목록에 추가 ◀◀ 수정
        response.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
        return response.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error("API Error:", error);
    return response
      .status(500)
      .json({ error: "An internal server error occurred." });
  }
}
