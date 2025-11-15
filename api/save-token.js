// api/save-token.js (final stable version)

import { kv } from "@vercel/kv";
import fs from "fs";
import os from "os";
import path from "path";

const TMP_DIR = path.join(os.tmpdir(), "plli-checker");
const TOKEN_FILE = path.join(TMP_DIR, "tokens.json");

// --- local file read/write (optional fallback) ---
function readTokens() {
  if (!fs.existsSync(TOKEN_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeTokens(tokens) {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
}

// ------------------------------------------------------

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      // ------------------------------------------------------
      // GET: 특정 token 불러오기
      // ------------------------------------------------------
      case "GET": {
        const { token } = req.query;
        if (!token) {
          return res
            .status(400)
            .json({ error: "token query parameter is required" });
        }

        // KV 조회
        const item = await kv.hget("fcm_tokens", token);

        // file fallback
        if (!item) {
          const fileTokens = readTokens();
          const found = fileTokens.find((t) => t.token === token);
          return res.status(200).json(found || { noticeOptIn: false });
        }

        return res.status(200).json(item);
      }

      // ------------------------------------------------------
      // POST: 토큰 저장/갱신
      // ------------------------------------------------------
      case "POST": {
        const { token, noticeOptIn = true } = req.body;

        if (!token) {
          return res.status(400).json({ error: "token is required" });
        }

        // KV 저장
        await kv.hset("fcm_tokens", {
          [token]: { token, noticeOptIn: !!noticeOptIn },
        });

        // file에도 저장 (fallback 용도)
        const fileTokens = readTokens();
        const updated = fileTokens.filter((t) => t.token !== token);
        updated.push({ token, noticeOptIn: !!noticeOptIn });
        writeTokens(updated);

        return res.status(200).json({ success: true });
      }

      // ------------------------------------------------------
      default:
        res.setHeader("Allow", ["GET", "POST"]);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (err) {
    console.error("[save-token Error]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
