export type LeadClassification = {
  classification: "Liquidator" | "Anchor" | "Nurture" | "Drop";
  isDistressed: boolean;
  isAbsentee: boolean;
  yearsOwned: number | null;
};

export function classifyLead(attomData: any): LeadClassification {
  if (!attomData) return { classification: "Drop", isDistressed: false, isAbsentee: false, yearsOwned: null };

  // --- 1. Core Data Extraction ---

  // Years Owned
  let yearsOwned: number | null = null;
  const saleSearchDate = attomData.sale?.saleSearchDate;
  if (saleSearchDate) {
    const purchaseYear = new Date(saleSearchDate).getFullYear();
    const currentYear = new Date().getFullYear();
    yearsOwned = currentYear - purchaseYear;
  }

  // Absentee / Investor Status
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

  // Equity
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

  // --- 2. The Ranking Logic ---

  // TIER 1: Liquidators (The highest flight risk)
  // They have severe distress OR they are absentee owners/investors holding a failed listing.
  if (isDistressed || isAbsentee) {
    return { classification: "Liquidator", isDistressed, isAbsentee, yearsOwned };
  }

  // TIER 2: Equity Anchors (The prime traditional targets)
  // They aren't distressed or investors, BUT they have lived there long enough for a life event (7+ years)
  // OR we can definitively prove they have >40% equity.
  if ((yearsOwned !== null && yearsOwned >= 7) || (equityPercent !== null && equityPercent >= 40)) {
    return { classification: "Anchor", isDistressed, isAbsentee, yearsOwned };
  }

  // TIER 3: Nurture (Low priority right now)
  // Owner-occupied, recently purchased (<7 years), and we can't prove high equity.
  // Very likely to just stay put since they missed their price.
  return { classification: "Nurture", isDistressed, isAbsentee, yearsOwned };
}
