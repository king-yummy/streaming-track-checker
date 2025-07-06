import { kv } from "@vercel/kv";

export const config = {
  runtime: "edge",
};

export default async function handler(request) {
  try {
    const count = await kv.get("fire-gauge-count");
    return new Response(JSON.stringify({ count: count || 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch count." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
