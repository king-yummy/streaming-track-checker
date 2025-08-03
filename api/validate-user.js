// /api/validate-user.js
import fs from "fs";
import path from "path";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { name } = req.body;

  const filePath = path.join(process.cwd(), "user.json");
  const rawData = fs.readFileSync(filePath, "utf-8");
  const users = JSON.parse(rawData);

  const isValid = users.includes(name.trim());
  res.status(200).json({ valid: isValid });
}
