export function passesFilters(attomData: any): { passes: boolean; isDistressed: boolean } {
  if (!attomData) return { passes: false, isDistressed: false };

  // Pre-Foreclosure / Distress Indicators Check (Bypasses filters)
  const foreclosureStage = attomData.foreclosure?.stage?.description?.toLowerCase() || "";
  const recordingDate = attomData.foreclosure?.default?.recordingDate;

  // Note: defaultAmount is requested to be captured per the prompt, though we don't necessarily filter on it.
  // const defaultAmount = attomData.foreclosure?.default?.defaultAmount;

  const isDistressed =
    foreclosureStage.includes("notice of default") ||
    foreclosureStage.includes("lis pendens") ||
    foreclosureStage.includes("notice of trustee's sale") ||
    (recordingDate !== undefined && recordingDate !== null && recordingDate !== "");

  if (isDistressed) {
    // If it's a distress lead, it bypasses the standard restrictions and passes as a top-tier target.
    return { passes: true, isDistressed: true };
  }

  // Standard Restrictions
  // 1. Corporate Indicator check
  const corporateIndicator = attomData.owner?.corporateIndicator;
  if (corporateIndicator === "Y") return { passes: false, isDistressed: false };

  // 2. Equity Percent check
  let equityPercent = attomData.avm?.amount?.equityPercent;

  // If equityPercent is not directly available, calculate it if possible
  if (equityPercent === undefined || equityPercent === null) {
    const openLoanBalance = attomData.mortgage?.amount?.openLoanBalance;
    const scrValue = attomData.avm?.amount?.scrValue;

    if (
      openLoanBalance !== undefined &&
      openLoanBalance !== null &&
      scrValue !== undefined &&
      scrValue !== null &&
      scrValue > 0
    ) {
      equityPercent = (1 - openLoanBalance / scrValue) * 100;
    } else {
      // If we can't calculate it, strict fail
      return { passes: false, isDistressed: false };
    }
  }

  if (equityPercent < 40) return { passes: false, isDistressed: false };

  // 3. Active Mortgage Interest Rate check
  const interestRate = attomData.mortgage?.firstMortgage?.interestRate;
  if (interestRate === undefined || interestRate === null) return { passes: false, isDistressed: false };
  if (interestRate < 4.5) return { passes: false, isDistressed: false };

  return { passes: true, isDistressed: false };
}
