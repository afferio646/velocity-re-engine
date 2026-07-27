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

    const maximumRows: any[][] = [];
    const highRows: any[][] = [];
    const primeRows: any[][] = [];
    let missingAddresses = 0;
    let apiFailures = 0;
    let lastApiError = "";

    // Helper function to process a single lead
    const processLead = async (lead: any) => {
      const addressCol = lead["Address"];
      const propCity = lead["Property City"];
      const propState = lead["Property State"];
      const propZip = lead["Property Zip"];

      const firstName = lead["First Name"];
      const lastName = lead["Last Name"];
      // Handle BatchLeads spaces in phone headers
      const phone1 = lead["Phone1"] || lead["Phone 1"];
      const phone2 = lead["Phone2"] || lead["Phone 2"];
      const dom = lead["DOM"];
      const leadType = lead["Lead Type"] || "Expired"; // Defaults to Expired if missing

      if (!addressCol) {
        missingAddresses++;
        return null;
      }

      let address1 = "";
      let address2 = "";
      let fullAddressForSheet = addressCol;

      // Check if it's the BatchLeads separated format
      if (propCity && propState && propZip) {
        address1 = addressCol;
        address2 = `${propCity}, ${propState} ${propZip}`;
        fullAddressForSheet = `${address1}, ${address2}`;
      } else {
        // Fallback to ArchAgent combined format
        const split = splitAddress(addressCol);
        if (!split || !split.address2) {
          missingAddresses++;
          return null;
        }
        address1 = split.address1;
        address2 = split.address2;
        fullAddressForSheet = addressCol;
      }

      // 1. Fetch from ATTOM
      const { data: attomData, error: attomError } = await fetchAttomData(address1, address2);

      const ownerName = `${firstName || ""} ${lastName || ""}`.trim() || "Owner";

      if (attomError || !attomData) {
        apiFailures++;
        if (attomError) {
          lastApiError = attomError;
        }
        // If ATTOM fails (e.g. PO Box), push it to Standard Expired Pipeline instead of dropping
        const fallbackTalkTrack = generateTalkTrack(
          firstName || "Owner",
          fullAddressForSheet,
          dom || "N/A",
          "N/A",
          "N/A",
          false,
          false,
          null,
          leadType
        );
        return {
          classification: "Prime",
          row: [fullAddressForSheet, ownerName, phone1 || "", phone2 || "", fallbackTalkTrack],
        };
      }

      // 2. Classify Lead
      const { classification, isDistressed, isAbsentee, yearsOwned } = classifyLead(attomData);

      if (classification === "Drop") return null;

      // 3. Extract needed variables for talk track
      const yearBuilt = attomData.summary?.yearbuilt || "N/A";
      const squareFootage = attomData.building?.size?.universalsize || "N/A";

      // 4. Generate Talk Track
      const talkTrack = generateTalkTrack(
        firstName || "Owner",
        fullAddressForSheet,
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
        row: [fullAddressForSheet, ownerName, phone1 || "", phone2 || "", talkTrack],
      };
    };

    // Process leads in batches to avoid timeout and overwhelming the ATTOM API
    const batchSize = 10;
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(processLead));

      for (const result of results) {
        if (result) {
          if (result.classification === "Maximum") {
            maximumRows.push(result.row);
          } else if (result.classification === "High") {
            highRows.push(result.row);
          } else if (result.classification === "Prime") {
            primeRows.push(result.row);
          }
        }
      }
    }

    // 6. Append to Google Sheets
    if (maximumRows.length > 0 || highRows.length > 0 || primeRows.length > 0) {
      await appendToGoogleSheet(maximumRows, highRows, primeRows);
    }

    return NextResponse.json({
      success: true,
      totalProcessed: leads.length,
      maximumLeads: maximumRows.length,
      highLeads: highRows.length,
      primeLeads: primeRows.length,
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
