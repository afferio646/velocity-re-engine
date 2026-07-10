import { google } from "googleapis";

export async function appendToGoogleSheet(rows: any[]) {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  // Handle newlines correctly in Vercel environment variables
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error("Google Sheets environment variables are not fully configured");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  try {
    // 1. Check if headers exist, if not create them. (Optional but requested: "write a clean header row")
    // Assuming we just append headers first if sheet is empty, but generally we can just write headers to A1:E1.
    // For safety, we can just ensure they are there or append directly. Let's do a simple append for the rows.

    // We will append the headers as well if we were starting from scratch, but since we are just appending leads:
    // It's safer to always append, or check first.
    // The instructions say: "write a clean header row to the Google Sheet using these exact names, and append the processed properties underneath them"
    // Let's implement a check to see if headers exist, and if not, add them.

    const getRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A1:E1",
    });

    const headers = [
      "Property Address",
      "Owner Name",
      "Primary Phone",
      "Secondary Phone",
      "Custom Talk Track",
    ];

    if (!getRes.data.values || getRes.data.values.length === 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Sheet1!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [headers],
        },
      });
    }

    // 2. Append the valid rows
    if (rows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Sheet1!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: rows,
        },
      });
    }
  } catch (error) {
    console.error("Error appending to Google Sheet:", error);
    throw error;
  }
}
