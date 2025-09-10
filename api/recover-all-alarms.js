import { kv } from "@vercel/kv";

const TOKENS_HASH = "fcm-tokens"; // HSET { [token]: JSON.stringify({ token, alarmOptIn, ... }) }
const PARTICIPANTS_SET = "superfan-participants"; // SADD token (슈퍼팬 클릭 참여자)
const HEADER_KEY = "x-recovery-key";

function toBool(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
  }
  if (typeof v === "number") return v !== 0;
  return false;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const provided =
    req.headers[HEADER_KEY] || req.headers[HEADER_KEY.toLowerCase()];
  if (!provided || provided !== process.env.RECOVERY_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const hAll = (await kv.hgetall(TOKENS_HASH)) || {};
    const hashTokens = Object.keys(hAll);

    let participantTokens = [];
    try {
      participantTokens = (await kv.smembers(PARTICIPANTS_SET)) || [];
    } catch {}

    const union = new Set(
      [...hashTokens, ...participantTokens].filter(Boolean)
    );
    if (union.size === 0) {
      return res.status(200).json({
        success: true,
        updated: 0,
        scanned: 0,
        note: "No tokens found in hash nor participants set.",
      });
    }

    let updated = 0,
      scanned = 0;
    for (const token of union) {
      scanned += 1;

      let raw = await kv.hget(TOKENS_HASH, token);
      let obj = raw;

      if (typeof obj === "string") {
        try {
          obj = JSON.parse(obj);
        } catch {
          obj = null;
        }
      }
      if (!obj || typeof obj !== "object") {
        obj = { token, alarmOptIn: true };
        await kv.hset(TOKENS_HASH, { [token]: JSON.stringify(obj) });
        updated += 1;
        continue;
      }

      const current = toBool(obj.alarmOptIn);
      if (current !== true) {
        obj.alarmOptIn = true;
        delete obj.noticeOptIn;
        delete obj.calendarOptIn;
        await kv.hset(TOKENS_HASH, { [token]: JSON.stringify(obj) });
        updated += 1;
      }
    }

    return res.status(200).json({
      success: true,
      scanned,
      updated,
      message:
        updated > 0
          ? `✅ 완료: ${updated}개 토큰을 alarmOptIn=true로 복구했습니다.`
          : "모든 스캔된 토큰이 이미 alarmOptIn=true였습니다.",
    });
  } catch (e) {
    console.error("[recover-all-alarms]", e);
    return res.status(500).json({ error: "Internal Error" });
  }
}
