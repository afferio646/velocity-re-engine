export type LeadClassification = {
  classification: "Maximum" | "High" | "Prime" | "Drop";
  isDistressed: boolean;
  isAbsentee: boolean;
  yearsOwned: number | null;
};

export function classifyLead(attomData: any): LeadClassification {
  if (!attomData) return { classification: "Drop", isDistressed: false, isAbsentee: false, yearsOwned: null };

  // --- 0. THE VELOCITY SCRUB (The Bouncer) ---

  // 0a. Did they already sell it? (Deed Scrub)
  let yearsOwned: number | null = null;
  const saleSearchDate = attomData.sale?.saleSearchDate;
  if (saleSearchDate) {
    const purchaseDate = new Date(saleSearchDate);
    const currentYear = new Date().getFullYear();
    yearsOwned = currentYear - purchaseDate.getFullYear();

    // If the deed transferred in the last 12 months, they likely already sold it. DROP IT.
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    if (purchaseDate > twelveMonthsAgo) {
      return { classification: "Drop", isDistressed: false, isAbsentee: false, yearsOwned };
    }
  }

  // --- 1. Core Data Extraction ---

  // Absentee / Corporate / Investor Status
  const ownerStatus = attomData.owner?.absenteeOwnerStatus;
  let isAbsentee = false;
  if (ownerStatus === "A" || ownerStatus === "S" || attomData.owner?.corporateIndicator === "Y") {
    isAbsentee = true;
  } else {
    const siteZip = attomData.address?.postal1;
    const mailZip = attomData.owner?.mailingAddressOne?.postal1;
    if (siteZip && mailZip && siteZip !== mailZip) {
      isAbsentee = true;
    }
  }

  // Severe Distress
  const foreclosureStage = attomData.foreclosure?.stage?.description?.toLowerCase() || "";
  const recordingDate = attomData.foreclosure?.default?.recordingDate;
  const taxDelinquentYear = attomData.assessment?.tax?.taxDelinquentYear;

  const isDistressed =
    foreclosureStage.includes("notice of default") ||
    foreclosureStage.includes("lis pendens") ||
    foreclosureStage.includes("notice of trustee's sale") ||
    (recordingDate !== undefined && recordingDate !== null && recordingDate !== "") ||
    (taxDelinquentYear !== undefined && taxDelinquentYear !== null && taxDelinquentYear > 0);

  // Equity Calculation
  let equityPercent = attomData.avm?.amount?.equityPercent;
  if (equityPercent === undefined || equityPercent === null) {
    const openLoanBalance = attomData.mortgage?.amount?.openLoanBalance;
    const scrValue = attomData.avm?.amount?.scrValue;
    if (openLoanBalance !== undefined && openLoanBalance !== null && scrValue !== undefined && scrValue !== null && scrValue > 0) {
      equityPercent = (1 - openLoanBalance / scrValue) * 100;
    } else {
      equityPercent = null;
    }
  }

  // --- 2. The Ranking Logic (Velocity Positioning) ---

  // TIER 1: Maximum Velocity (Investors / Distressed)
  if (isDistressed || isAbsentee) {
    return { classification: "Maximum", isDistressed, isAbsentee, yearsOwned };
  }

  // TIER 2: High Velocity (Owner Occupied, Verifiable High Equity)
  if (equityPercent !== null && equityPercent >= 40) {
    return { classification: "High", isDistressed, isAbsentee, yearsOwned };
  }

  // TIER 3: Prime Velocity (Owner Occupied, Low/Unknown Equity)
  return { classification: "Prime", isDistressed, isAbsentee, yearsOwned };
}
