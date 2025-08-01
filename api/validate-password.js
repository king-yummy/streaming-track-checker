export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*"); // allow Chrome extension fetch
  res.setHeader("Access-Control-Allow-Methods", "GET");

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
