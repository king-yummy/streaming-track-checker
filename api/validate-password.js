export default function handler(req, res) {
  // ✅ CORS 대응: OPTIONS method 처리
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.status(200).end();
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  const validPassword = process.env.PLLI_PASSWORD;
  const input = req.query.pw;

  if (!validPassword) {
    return res
      .status(500)
      .json({ success: false, error: "서버에 비밀번호가 설정되지 않았어요." });
  }

  if (input === validPassword) {
    return res.status(200).json({ success: true });
  } else {
    return res.status(401).json({ success: false });
  }
}
