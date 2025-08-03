export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end(); // Method Not Allowed
  }

  try {
    // Vercel 환경 변수에서 사용자 목록을 가져옵니다.
    const userListJson = process.env.USER_LIST;

    if (!userListJson) {
      throw new Error("USER_LIST 환경 변수가 설정되지 않았습니다.");
    }

    const users = JSON.parse(userListJson);
    const { name } = req.body;
    const valid = users.includes(name);

    res.status(200).json({ valid });
  } catch (error) {
    console.error("User validation error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
