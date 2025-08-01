// /api/validate-password.js
export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*"); // 👈 모든 출처 허용 (or 제한 가능)
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const validPassword = process.env.PLLI_PASSWORD;
  const input = req.query.pw;

  if (!validPassword) {
    return res.status(500).json({ success: false, error: "No password set." });
  }

  if (input === validPassword) {
    return res.status(200).json({ success: true });
  } else {
    return res.status(401).json({ success: false });
  }
}


export default function handler(req, res) {
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
