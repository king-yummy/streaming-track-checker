export default function handler(req, res) {
  // 🧩 Preflight 요청 처리
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*"); // ⭐ 중요
    res.status(200).end();
    return; // ⭐ 이거 꼭 있어야 CORS 에러 안 남
  }

  // ✅ 모든 응답에 CORS 헤더 삽입
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  const validPassword = process.env.PLLI_PASSWORD;
  const input = req.query.pw;

  if (!validPassword) {
    return res
      .status(500)
      .json({ success: false, error: "No password set on server." });
  }

  if (input === validPassword) {
    return res.status(200).json({ success: true });
  } else {
    return res.status(401).json({ success: false });
  }
}
