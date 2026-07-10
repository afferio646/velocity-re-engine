export function passesFilters(attomData: any): boolean {
  if (!attomData) return false;

  // 1. Corporate Indicator check
  const corporateIndicator = attomData.owner?.corporateIndicator;
  if (corporateIndicator === "Y") return false;

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
      return false;
    }
  }

  if (equityPercent < 40) return false;

  // 3. Active Mortgage Interest Rate check
  const interestRate = attomData.mortgage?.firstMortgage?.interestRate;
  if (interestRate === undefined || interestRate === null) return false;
  if (interestRate < 4.5) return false;

  return true;
}
