import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  const counts = await kv.hgetall("todoGroupCounts");
  return res.status(200).json(counts || {});
}
