import { google } from "googleapis";

export async function appendToGoogleSheet(maximumRows: any[][], highRows: any[][], primeRows: any[][]) {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL?.replace(/^"|"$/g, '').trim();
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || "";

  // Make private key parsing extremely robust for Vercel environment variables
  if (privateKey) {
    // Remove surrounding quotes if the user accidentally copied them
    privateKey = privateKey.replace(/^"|"$/g, '');

    // Convert literal \n strings to actual newlines
    privateKey = privateKey.replace(/\\n/g, "\n");

    // If the key is missing the BEGIN/END tags, try to reconstruct it
    if (!privateKey.includes("BEGIN PRIVATE KEY")) {
      // Remove any spaces just in case
      const cleanKey = privateKey.replace(/\s+/g, '');
      // Format it into 64-character lines (standard PEM format)
      const formattedKey = cleanKey.match(/.{1,64}/g)?.join('\n') || cleanKey;
      privateKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----\n`;
    } else if (!privateKey.includes("\n")) {
      // If tags exist but all newlines were lost (turned into spaces by Vercel)
      const match = privateKey.match(/-----BEGIN PRIVATE KEY-----(.*)-----END PRIVATE KEY-----/);
      if (match) {
         const keyBody = match[1].replace(/\s+/g, '');
         const formattedKey = keyBody.match(/.{1,64}/g)?.join('\n') || keyBody;
         privateKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----\n`;
      }
    }
  }

  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID?.replace(/^"|"$/g, '').trim();

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

    const ensureSheet = async (title: string) => {
      if (!existingSheets.includes(title)) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{ addSheet: { properties: { title } } }]
          }
        });

        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${title}!A1`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [headers] }
        });
      } else {
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

    if (maximumRows.length > 0) {
      await ensureSheet("Maximum Velocity");
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Maximum Velocity!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: maximumRows },
      });
    }

    if (highRows.length > 0) {
      await ensureSheet("High Velocity");
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "High Velocity!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: highRows },
      });
    }

    if (primeRows.length > 0) {
      await ensureSheet("Prime Velocity");
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Prime Velocity!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: primeRows },
      });
    }

  } catch (error) {
    console.error("Error appending to Google Sheet:", error);
    throw error;
  }
}
