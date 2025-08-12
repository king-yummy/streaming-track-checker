import { kv } from "@vercel/kv";
export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  const t = new Date(Date.now() + 16 * 60 * 1000);
  const yyyy = t.getFullYear();
  const mm = String(t.getMonth() + 1).padStart(2, "0");
  const dd = String(t.getDate()).padStart(2, "0");
  const HH = String(t.getHours()).padStart(2, "0");
  const MM = String(t.getMinutes()).padStart(2, "0");

  const id = `sample-${Date.now()}`;
  const ev = {
    id,
    title: "샘플 이벤트",
    start: `${yyyy}-${mm}-${dd}T${HH}:${MM}`,
  };

  // 리스트가 아니라 해시에 저장
  await kv.hset("events", { [id]: JSON.stringify(ev) });
  res.status(200).json({ ok: true, ev });
}
