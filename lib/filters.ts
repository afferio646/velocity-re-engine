export type LeadClassification = {
  classification: "Golden" | "Nurture" | "Drop";
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
  // Sometimes given as 'A' (Absentee) vs 'O' (Owner Occupied). Or we compare site/mail zips if it's missing.
  const ownerStatus = attomData.owner?.absenteeOwnerStatus;
  let isAbsentee = false;
  if (ownerStatus === "A" || ownerStatus === "S") { // A = Absentee, S = State Absentee
    isAbsentee = true;
  } else {
    // Fallback: check if mailing zip and property zip are different
    const siteZip = attomData.address?.postal1;
    const mailZip = attomData.owner?.mailingAddressOne?.postal1;
    if (siteZip && mailZip && siteZip !== mailZip) {
      isAbsentee = true;
    }
  }

  // --- 2. Distress Indicators (Bypasses standard filters) ---

  const foreclosureStage = attomData.foreclosure?.stage?.description?.toLowerCase() || "";
  const recordingDate = attomData.foreclosure?.default?.recordingDate;
  const taxDelinquentYear = attomData.assessment?.tax?.taxDelinquentYear; // Silent distress

  const isDistressed =
    foreclosureStage.includes("notice of default") ||
    foreclosureStage.includes("lis pendens") ||
    foreclosureStage.includes("notice of trustee's sale") ||
    (recordingDate !== undefined && recordingDate !== null && recordingDate !== "") ||
    (taxDelinquentYear !== undefined && taxDelinquentYear !== null && taxDelinquentYear > 0);

  // If distressed, automatically upgrade to Golden (60-day motivation)
  if (isDistressed) {
    return { classification: "Golden", isDistressed, isAbsentee, yearsOwned };
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
      // If we can't calculate it, push to Nurture
      return { classification: "Nurture", isDistressed, isAbsentee, yearsOwned };
    }
  }

  if (equityPercent < 40) return { classification: "Nurture", isDistressed, isAbsentee, yearsOwned };

  // Active Mortgage Interest Rate check
  const interestRate = attomData.mortgage?.firstMortgage?.interestRate;
  if (interestRate === undefined || interestRate === null) return { classification: "Nurture", isDistressed, isAbsentee, yearsOwned };
  if (interestRate < 4.5) return { classification: "Nurture", isDistressed, isAbsentee, yearsOwned };

  // If it passes all financial strict filters, it's Golden.
  return { classification: "Golden", isDistressed, isAbsentee, yearsOwned };
}
