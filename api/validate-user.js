import fs from "fs";
import path from "path";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end(); // Method Not Allowed
  }

  try {
    const filePath = path.resolve(process.cwd(), "user.json");
    const data = fs.readFileSync(filePath, "utf-8");
    const users = JSON.parse(data);

    const { name } = req.body;
    const valid = users.includes(name);

    res.status(200).json({ valid });
  } catch (error) {
    console.error("User validation error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
