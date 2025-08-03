import fs from "fs/promises";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "허용되지 않은 요청 방식입니다." });
  }

  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: "이름이 입력되지 않았습니다." });
  }

  try {
    // 날짜 기준
    const today = new Date().toISOString().slice(0, 10);

    // 경로 설정
    const pwPath = path.join(process.cwd(), "pw.json");
    const usersPath = path.join(process.cwd(), "api", "users.json");
    const logsPath = path.join(process.cwd(), "api", "logs.json");

    // 파일 읽기
    const [pwData, userData, logData] = await Promise.all([
      fs.readFile(pwPath, "utf-8"),
      fs.readFile(usersPath, "utf-8"),
      fs.readFile(logsPath, "utf-8").catch(() => "[]"), // 없으면 빈 배열
    ]);

    const passwords = JSON.parse(pwData)[today];
    const users = JSON.parse(userData);
    const logs = JSON.parse(logData);

    // 유효성 검사
    if (!users[name]) {
      return res.status(403).json({ message: "등록되지 않은 사용자입니다." });
    }

    if (!passwords || passwords.length === 0) {
      return res
        .status(500)
        .json({ message: "오늘의 비밀번호가 아직 등록되지 않았습니다." });
    }

    // 랜덤 비밀번호 선택
    const password = passwords[Math.floor(Math.random() * passwords.length)];

    // 로그 기록 추가
    logs.push({
      name,
      timestamp: new Date().toISOString(),
    });
    await fs.writeFile(logsPath, JSON.stringify(logs, null, 2));

    // 응답
    return res.status(200).json({ password });
  } catch (error) {
    console.error("비밀번호 발급 오류:", error);
    return res.status(500).json({ message: "서버 오류 발생" });
  }
}
