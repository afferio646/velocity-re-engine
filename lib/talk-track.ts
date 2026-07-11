export function generateTalkTrack(
  ownerFirstName: string,
  streetAddress: string,
  dom: string,
  yearBuilt: string | number,
  squareFootage: string | number,
  isDistressed: boolean
): string {
  const defaultInventory = "under 20";

  let track = `Hi ${ownerFirstName}, I noticed your property on ${streetAddress} came off the market after being listed for ${dom} days. I'm calling because our system actively tracks local asset profiles, and we flagged your home specifically because it fits the exact ${yearBuilt} footprint of ${squareFootage} square feet that buyers are targeting. Right now in your immediate area, housing inventory is sitting at a severe deficit with ${defaultInventory} homes active on the market. We aren't looking to list your home traditionally—we have an immediate inventory gap for your exact property profile. Are you still open to a clean offer if we can match your terms, or have you decided to take the property off the market for good?`;

  if (isDistressed) {
    track += " Our system also flagged that your market profile recently shifted, meaning we can move on an expedited timeline to clear any outstanding balances or terms within a clean 14-day window if that fits your schedule better.";
  }

  return track;
}
