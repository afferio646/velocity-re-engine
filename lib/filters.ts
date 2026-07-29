export type LeadClassification = {
  classification: "Maximum" | "High" | "Prime" | "Drop";
  disposition: string;
  yearsOwned: number | null;
};

export function classifyLead(attomData: any, leadCsvRow: any = {}): LeadClassification {
  // We no longer strictly drop if attomData is missing because we can use the CSV!

  // --- 0. THE VELOCITY SCRUB (The Bouncer) ---
  let yearsOwned: number | null = null;
  const saleSearchDate = attomData?.sale?.saleSearchDate;
  if (saleSearchDate) {
    const purchaseDate = new Date(saleSearchDate);
    const currentYear = new Date().getFullYear();
    yearsOwned = currentYear - purchaseDate.getFullYear();

    // If the deed transferred in the last 12 months, they likely already sold it. DROP IT.
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    if (purchaseDate > twelveMonthsAgo) {
      return { classification: "Drop", disposition: "Recently Sold", yearsOwned };
    }
  }

  // --- 1. Disposition Logic (BatchLeads CSV + ATTOM) ---

  let disposition = "Owner Occupied"; // Fallback

  // CSV Data Extraction
  const csvIsVacant = (leadCsvRow["Is Vacant"] || "").trim().toLowerCase();
  const csvForeclosureStatus = (leadCsvRow["Foreclosure Status"] || "").trim();
  const csvOwnerOccupied = (leadCsvRow["Owner Occupied"] || "").trim().toLowerCase();
  const csvFirstName = (leadCsvRow["First Name"] || "").trim();
  const csvLastName = (leadCsvRow["Last Name"] || "").trim();

  // ATTOM Data Extraction (use optional chaining safely)
  const foreclosureStage = attomData?.foreclosure?.stage?.description?.toLowerCase() || "";
  const recordingDate = attomData?.foreclosure?.default?.recordingDate;
  const taxDelinquentYear = attomData?.assessment?.tax?.taxDelinquentYear;

  const attomIsDistressed =
    foreclosureStage.includes("notice of default") ||
    foreclosureStage.includes("lis pendens") ||
    foreclosureStage.includes("notice of trustee's sale") ||
    (recordingDate !== undefined && recordingDate !== null && recordingDate !== "") ||
    (taxDelinquentYear !== undefined && taxDelinquentYear !== null && taxDelinquentYear > 0);

  const ownerStatus = attomData?.owner?.absenteeOwnerStatus;
  const attomIsCorporate = ownerStatus === "A" || ownerStatus === "S" || attomData?.owner?.corporateIndicator === "Y";

  let attomIsAbsentee = false;
  const siteZip = attomData?.address?.postal1;
  const mailZip = attomData?.owner?.mailingAddressOne?.postal1;
  if (siteZip && mailZip && siteZip !== mailZip) {
    attomIsAbsentee = true;
  }

  // Evaluate Disposition priority (Highest to lowest)
  if (attomIsDistressed || csvForeclosureStatus) {
    disposition = "Pre-Foreclosure / Lien";
  } else if (csvIsVacant === "yes") {
    disposition = "Vacant";
  } else if ((!csvFirstName && csvLastName) || attomIsCorporate) {
    disposition = "Corporate Owned";
  } else if (csvOwnerOccupied === "no" || attomIsAbsentee) {
    disposition = "Absentee Owner / Tired Landlord";
  }

  // --- 2. Bucket Assignment ---

  // Maximum Velocity
  if (disposition === "Pre-Foreclosure / Lien" || disposition === "Vacant") {
    return { classification: "Maximum", disposition, yearsOwned };
  }

  // High Velocity
  if (disposition === "Corporate Owned" || disposition === "Absentee Owner / Tired Landlord") {
    return { classification: "High", disposition, yearsOwned };
  }

  // Prime Velocity
  return { classification: "Prime", disposition, yearsOwned };
}
