import { NextResponse } from "next/server";
import Papa from "papaparse";
import { splitAddress } from "../../../lib/address-utils";
import { fetchAttomData } from "../../../lib/attom-api";
import { classifyLead } from "../../../lib/filters";

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
      transformHeader: (header) => header.trim(),
    });

    if (parsedData.errors.length > 0) {
      return NextResponse.json(
        { error: "Error parsing CSV", details: parsedData.errors },
        { status: 400 }
      );
    }

    const leads = parsedData.data as any[];
    const originalHeaders = parsedData.meta.fields || [];

    const scrubbedLeads: any[] = [];
    let missingAddresses = 0;
    let apiFailures = 0;
    let droppedCount = 0;

    const processLead = async (lead: any) => {
      const addressCol = lead["Address"] || lead["Property Address"];
      const propCity = lead["Property City"];
      const propState = lead["Property State"];
      const propZip = lead["Property Zip"];

      if (!addressCol) {
        missingAddresses++;
        return null;
      }

      let address1 = "";
      let address2 = "";

      if (propCity && propState && propZip) {
        address1 = addressCol;
        address2 = `${propCity}, ${propState} ${propZip}`;
      } else {
        const split = splitAddress(addressCol);
        if (!split || !split.address2) {
          missingAddresses++;
          return null;
        }
        address1 = split.address1;
        address2 = split.address2;
      }

      const { data: attomData, error: attomError } = await fetchAttomData(address1, address2);

      if (attomError) {
        apiFailures++;
      }

      // We only care about dropping sold properties at this stage. Disposition is calculated but we just want to keep non-dropped leads.
      const { classification, disposition } = classifyLead(attomData, lead);

      if (classification === "Drop") {
        droppedCount++;
        return null;
      }

      // Add the calculated disposition to the lead so it's ready for Skip Matrix/Step 2
      const updatedLead = { ...lead, "Calculated Disposition": disposition };
      return updatedLead;
    };

    const batchSize = 10;
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(processLead));

      for (const result of results) {
        if (result) {
          scrubbedLeads.push(result);
        }
      }
    }

    // Convert the scrubbed leads back to CSV
    const newHeaders = [...originalHeaders, "Calculated Disposition"];
    const csvOutput = Papa.unparse(scrubbedLeads, { columns: newHeaders });

    return new NextResponse(csvOutput, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="scrubbed_leads_for_skip_matrix.csv"',
        "X-Total-Processed": leads.length.toString(),
        "X-Dropped-Count": droppedCount.toString(),
        "X-Api-Failures": apiFailures.toString()
      }
    });

  } catch (error: any) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
