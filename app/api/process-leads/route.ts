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
      transformHeader: (header) => header.trim(), // Fixes invisible spaces or BOM characters
    });

    if (parsedData.errors.length > 0) {
      return NextResponse.json(
        { error: "Error parsing CSV", details: parsedData.errors },
        { status: 400 }
      );
    }

    const leads = parsedData.data as any[];
    const headersFound = parsedData.meta.fields || [];

    const goldenRows: any[][] = [];
    const nurtureRows: any[][] = [];
    let missingAddresses = 0;
    let apiFailures = 0;
    let lastApiError = "";

    // Helper function to process a single lead
    const processLead = async (lead: any) => {
      const fullAddress = lead["Address"];
      const firstName = lead["First Name"];
      const lastName = lead["Last Name"];
      const phone1 = lead["Phone1"];
      const phone2 = lead["Phone2"];
      const dom = lead["DOM"];
      const leadType = lead["Lead Type"] || "Expired"; // Defaults to Expired if missing

      if (!fullAddress) {
        missingAddresses++;
        return null;
      }

      const split = splitAddress(fullAddress);
      if (!split) {
        missingAddresses++;
        return null;
      }

      const { address1, address2 } = split;

      // 1. Fetch from ATTOM
      const { data: attomData, error: attomError } = await fetchAttomData(address1, address2);
      if (attomError || !attomData) {
        apiFailures++;
        if (attomError) {
          lastApiError = attomError;
        }
        return null;
      }

      // 2. Classify Lead
      const { classification, isDistressed, isAbsentee, yearsOwned } = classifyLead(attomData);

      if (classification === "Drop") return null;

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
      return {
        classification,
        row: [fullAddress, ownerName, phone1 || "", phone2 || "", talkTrack],
      };
    };

    // Process leads in batches to avoid timeout and overwhelming the ATTOM API
    const batchSize = 10;
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(processLead));

      for (const result of results) {
        if (result) {
          if (result.classification === "Golden") {
            goldenRows.push(result.row);
          } else if (result.classification === "Nurture") {
            nurtureRows.push(result.row);
          }
        }
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
      nurtureLeads: nurtureRows.length,
      missingAddresses,
      apiFailures,
      lastApiError,
      headersFound
    });
  } catch (error: any) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
