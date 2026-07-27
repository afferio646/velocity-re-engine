export function generateTalkTrack(
  ownerName: string,
  address: string,
  dom: string,
  yearBuilt: string,
  squareFootage: string,
  isDistressed: boolean,
  isAbsentee: boolean,
  yearsOwned: number | null,
  classification: "Maximum" | "High" | "Prime" | "Drop" | "Nurture" | "Anchor" | "Liquidator"
): string {
  // Use first name if possible
  const firstName = ownerName.split(" ")[0] || "there";

  // Format variables cleanly
  const sqftStr = squareFootage !== "N/A" ? squareFootage : "specific";
  const yearStr = yearBuilt !== "N/A" ? yearBuilt : "property";

  // MAXIMUM VELOCITY (Investors / Corporate / Distressed)
  if (classification === "Maximum" || classification === "Liquidator") {
    return `Hi ${firstName}, our system tracked that your investment property on ${address} recently came off the market. We actively map off-market acquisition targets in this area, and your asset fits the exact ${sqftStr} footprint our investor network is looking to absorb. I'm not sure why it didn't move on the retail market, but our buying matrix usually solves those gaps. Are you planning to hold and tenant the property, or are you open to exploring alternatives? If so, I'd like to stop by and get a clear picture of the asset so I can align it with our buyers.`;
  }

  // HIGH VELOCITY (Owner-Occupied, High Equity)
  if (classification === "High" || classification === "Anchor") {
    return `Hi ${firstName}, I'm calling regarding your property on ${address}. Our system actively tracks neighborhood footprints, and we flagged your home because buyers are currently targeting your exact ${yearStr} profile with ${sqftStr} square feet in this area. I'm not sure why your recent listing failed, but our buying matrix can usually solve those roadblocks. Have you decided to keep it off the market for good, or are you open to looking at alternatives? If so, I'd like to stop by and see the property so I can get a clear picture of how to align you with our buyers.`;
  }

  // PRIME VELOCITY (Owner-Occupied, Lower Equity / Fallback)
  return `Hi ${firstName}, I'm reaching out about ${address}. We monitor specific property profiles in your neighborhood, and your ${sqftStr} footprint is currently in high demand within our buyer network. I know your listing recently expired, and while I don't know the specifics of why it didn't sell, our positioning strategy usually bridges that gap—often through creative structures if traditional financing is the hurdle. Are you taking a break from the market, or are you open to alternatives? If you are, I'd love to quickly stop by so I can see exactly how to position your home for our buyers.`;
}
