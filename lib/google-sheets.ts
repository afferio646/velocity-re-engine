import { google } from "googleapis";

export async function appendToGoogleSheet(goldenRows: any[][], nurtureRows: any[][]) {
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
    const sheetData = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = sheetData.data.sheets?.map(s => s.properties?.title) || [];

    const headers = [
      "Property Address",
      "Owner Name",
      "Primary Phone",
      "Secondary Phone",
      "Custom Talk Track",
    ];

    // Helper to ensure a sheet tab exists and has headers
    const ensureSheet = async (title: string) => {
      if (!existingSheets.includes(title)) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{ addSheet: { properties: { title } } }]
          }
        });

        // Add headers to new sheet
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${title}!A1`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [headers] }
        });
      } else {
        // If sheet exists, just make sure headers are there (simple check)
        const getRes = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${title}!A1:E1`,
        });
        if (!getRes.data.values || getRes.data.values.length === 0) {
          await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${title}!A1`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [headers] },
          });
        }
      }
    };

    if (goldenRows.length > 0) {
      await ensureSheet("Golden Leads");
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Golden Leads!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: goldenRows },
      });
    }

    if (nurtureRows.length > 0) {
      await ensureSheet("12-Month Nurture");
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "12-Month Nurture!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: nurtureRows },
      });
    }

  } catch (error) {
    console.error("Error appending to Google Sheet:", error);
    throw error;
  }
}
