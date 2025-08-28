// api/sheets.js
export default async function handler(req, res) {
  try {
    const { ranges = "TodoList!A:Z", majorDimension = "ROWS" } = req.query;
    const spreadsheetId = "1tGslp_8ahx8E5Y8kvIFq3DAcciLgtSyTvlTBROOrsKg";
    const key = process.env.GOOGLE_SHEETS_API_KEY; // 🔑 Vercel 환경변수

    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet` +
      `?ranges=${encodeURIComponent(
        ranges
      )}&majorDimension=${majorDimension}&key=${key}`;

    const r = await fetch(url);
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "internal_error" });
  }
}
