import { NextResponse } from "next/server";
import Papa from "papaparse";
import { splitAddress } from "../../../lib/address-utils";
import { fetchAttomData } from "../../../lib/attom-api";
import { classifyLead } from "../../../lib/filters";
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
    const goldenRows: any[][] = [];
    const nurtureRows: any[][] = [];

    for (const lead of leads) {
      const fullAddress = lead["Address"];
      const firstName = lead["First Name"];
      const lastName = lead["Last Name"];
      const phone1 = lead["Phone1"];
      const phone2 = lead["Phone2"];
      const dom = lead["DOM"];
      const leadType = lead["Lead Type"] || "Expired"; // Defaults to Expired if missing

      if (!fullAddress) continue;

      const split = splitAddress(fullAddress);
      if (!split) continue;

      const { address1, address2 } = split;

      // 1. Fetch from ATTOM
      const attomData = await fetchAttomData(address1, address2);

      // 2. Classify Lead
      const { classification, isDistressed, isAbsentee, yearsOwned } = classifyLead(attomData);

      if (classification === "Drop") continue;

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
        squareFootage,
        isDistressed,
        isAbsentee,
        yearsOwned,
        leadType
      );

      // 5. Prepare row for Google Sheet
      const row = [
        fullAddress,
        ownerName,
        phone1 || "",
        phone2 || "",
        talkTrack,
      ];

      if (classification === "Golden") {
        goldenRows.push(row);
      } else if (classification === "Nurture") {
        nurtureRows.push(row);
      }
    }

    // 6. Append to Google Sheets
    if (goldenRows.length > 0 || nurtureRows.length > 0) {
      await appendToGoogleSheet(goldenRows, nurtureRows);
    }

    return NextResponse.json({
      success: true,
      totalProcessed: leads.length,
      validLeads: goldenRows.length,
      nurtureLeads: nurtureRows.length
    });
  } catch (error: any) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
