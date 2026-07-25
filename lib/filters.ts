export type LeadClassification = {
  classification: "Liquidator" | "Anchor" | "Nurture" | "Drop";
  isDistressed: boolean;
  isAbsentee: boolean;
  yearsOwned: number | null;
};

export function classifyLead(attomData: any): LeadClassification {
  if (!attomData) return { classification: "Drop", isDistressed: false, isAbsentee: false, yearsOwned: null };

  // --- 1. Behavioral & Lifestyle Indicators ---

  // Length of Ownership (Equity Fatigue)
  let yearsOwned: number | null = null;
  const saleSearchDate = attomData.sale?.saleSearchDate;
  if (saleSearchDate) {
    const purchaseYear = new Date(saleSearchDate).getFullYear();
    const currentYear = new Date().getFullYear();
    yearsOwned = currentYear - purchaseYear;
  }

  // Absentee Owner Indicator
  const ownerStatus = attomData.owner?.absenteeOwnerStatus;
  let isAbsentee = false;
  if (ownerStatus === "A" || ownerStatus === "S") {
    isAbsentee = true;
  } else {
    const siteZip = attomData.address?.postal1;
    const mailZip = attomData.owner?.mailingAddressOne?.postal1;
    if (siteZip && mailZip && siteZip !== mailZip) {
      isAbsentee = true;
    }
  }

  // --- 2. Distress Indicators (Bypasses standard filters) ---

  const foreclosureStage = attomData.foreclosure?.stage?.description?.toLowerCase() || "";
  const recordingDate = attomData.foreclosure?.default?.recordingDate;
  const taxDelinquentYear = attomData.assessment?.tax?.taxDelinquentYear;

  const isDistressed =
    foreclosureStage.includes("notice of default") ||
    foreclosureStage.includes("lis pendens") ||
    foreclosureStage.includes("notice of trustee's sale") ||
    (recordingDate !== undefined && recordingDate !== null && recordingDate !== "") ||
    (taxDelinquentYear !== undefined && taxDelinquentYear !== null && taxDelinquentYear > 0);

  // If distressed, automatically upgrade to Liquidator (High motivation)
  if (isDistressed) {
    return { classification: "Liquidator", isDistressed, isAbsentee, yearsOwned };
  }

  // --- 3. Strict Financial Guardrails (For non-distressed) ---

  // Corporate Indicator check
  const corporateIndicator = attomData.owner?.corporateIndicator;
  if (corporateIndicator === "Y") return { classification: "Nurture", isDistressed, isAbsentee, yearsOwned };

  // Equity Percent check
  let equityPercent = attomData.avm?.amount?.equityPercent;
  if (equityPercent === undefined || equityPercent === null) {
    const openLoanBalance = attomData.mortgage?.amount?.openLoanBalance;
    const scrValue = attomData.avm?.amount?.scrValue;

    if (openLoanBalance !== undefined && openLoanBalance !== null && scrValue !== undefined && scrValue !== null && scrValue > 0) {
      equityPercent = (1 - openLoanBalance / scrValue) * 100;
    } else {
      // If we can't calculate equity at all, push to Nurture
      return { classification: "Nurture", isDistressed, isAbsentee, yearsOwned };
    }
  }

  // If they have less than 40% equity, they are Nurture (no cash to move)
  if (equityPercent < 40) return { classification: "Nurture", isDistressed, isAbsentee, yearsOwned };

  // Active Mortgage Interest Rate check
  const interestRate = attomData.mortgage?.firstMortgage?.interestRate;

  // They have >40% equity, but if we can't find their rate OR it's low, they are an Anchor
  if (interestRate === undefined || interestRate === null || interestRate < 4.5) {
      return { classification: "Anchor", isDistressed, isAbsentee, yearsOwned };
  }

  // If it passes all financial strict filters (>40% equity AND >4.5% rate), it's a Liquidator.
  return { classification: "Liquidator", isDistressed, isAbsentee, yearsOwned };
}
