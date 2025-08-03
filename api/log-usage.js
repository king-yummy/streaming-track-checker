import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: "Missing username" });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      projectId: process.env.GOOGLE_PROJECT_ID,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const now = new Date();
    const timestamp = now.toISOString();

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: "auth!A:C", // auth 시트의 A~C열에 추가
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            username,
            timestamp,
            req.headers["x-forwarded-for"] || req.socket.remoteAddress,
          ],
        ],
      },
    });

    return res.status(200).json({ message: "Logged successfully" });
  } catch (error) {
    console.error("Google Sheets API error:", error);
    return res.status(500).json({ message: "Logging failed", error });
  }
}
