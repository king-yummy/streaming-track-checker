import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  await kv.del("todoGroupCounts");
  return res.status(200).json({ ok: true });
}
