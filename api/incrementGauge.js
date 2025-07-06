import { kv } from "@vercel/kv";

export const config = {
  runtime: "edge",
};

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  try {
    const newCount = await kv.incr("fire-gauge-count");
    return new Response(JSON.stringify({ count: newCount }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to increment count." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
