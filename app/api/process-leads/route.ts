import { NextResponse } from "next/server";
import Papa from "papaparse";
import { splitAddress } from "../../../lib/address-utils";
import { fetchAttomData } from "../../../lib/attom-api";
import { passesFilters } from "../../../lib/filters";
import { generateTalkTrack } from "../../../lib/talk-track";
import { appendToGoogleSheet } from "../../../lib/google-sheets";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "No file uploaded or invalid file format" },
        { status: 400 }
      );
    }

    const fileContent = await file.text();

    const parsedData = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsedData.errors.length > 0) {
      return NextResponse.json(
        { error: "Error parsing CSV", details: parsedData.errors },
        { status: 400 }
      );
    }

    const leads = parsedData.data as any[];
    const processedRows: any[][] = [];

    for (const lead of leads) {
      const fullAddress = lead["Address"];
      const firstName = lead["First Name"];
      const lastName = lead["Last Name"];
      const phone1 = lead["Phone1"];
      const phone2 = lead["Phone2"];
      const dom = lead["DOM"];

      if (!fullAddress) continue;

      const split = splitAddress(fullAddress);
      if (!split) continue;

      const { address1, address2 } = split;

      // 1. Fetch from ATTOM
      const attomData = await fetchAttomData(address1, address2);

      // 2. Filter logic
      if (!passesFilters(attomData)) {
        continue;
      }

      // 3. Extract needed variables for talk track
      const ownerName = `${firstName || ""} ${lastName || ""}`.trim() || "Owner";
      const yearBuilt = attomData.summary?.yearbuilt || "N/A";
      const squareFootage = attomData.building?.size?.universalsize || "N/A";

      // 4. Generate Talk Track
      const talkTrack = generateTalkTrack(
        firstName || "Owner",
        fullAddress,
        dom || "N/A",
        yearBuilt,
        squareFootage
      );

      // 5. Prepare row for Google Sheet
      processedRows.push([
        fullAddress,
        ownerName,
        phone1 || "",
        phone2 || "",
        talkTrack,
      ]);
    }

    // 6. Append to Google Sheets
    if (processedRows.length > 0) {
      await appendToGoogleSheet(processedRows);
    }

    return NextResponse.json({
      success: true,
      totalProcessed: leads.length,
      validLeads: processedRows.length,
    });
  } catch (error: any) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
