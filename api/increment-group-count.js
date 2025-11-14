import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { groupId } = req.body;
  if (!groupId) return res.status(400).json({ error: "groupId required" });

  await kv.hincrby("todoGroupCounts", groupId, 1);

  return res.status(200).json({ ok: true });
}
