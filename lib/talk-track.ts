export function generateTalkTrack(
  ownerFirstName: string,
  streetAddress: string,
  dom: string,
  yearBuilt: string | number,
  squareFootage: string | number,
  isDistressed: boolean,
  isAbsentee: boolean,
  yearsOwned: number | null,
  leadType: string
): string {
  const defaultInventory = "under 20";
  let track = "";

  if (leadType.toLowerCase().includes("fsbo")) {
    track = `Hi ${ownerFirstName}, I noticed you're currently selling your property on ${streetAddress} by owner. I'm not calling to list it—our system actively tracks local asset profiles, and we flagged your home because it fits the exact ${yearBuilt} footprint of ${squareFootage} square feet that our buyers are aggressively targeting right now. With only about ${defaultInventory} active homes matching this in your immediate area, we have a severe inventory gap. Are you open to a clean offer if we can match your numbers, or are you strictly looking for retail buyers?`;
  } else {
    // Default to Expired script
    track = `Hi ${ownerFirstName}, I noticed your property on ${streetAddress} came off the market after being listed for ${dom} days. I'm calling because our system actively tracks local asset profiles, and we flagged your home specifically because it fits the exact ${yearBuilt} footprint of ${squareFootage} square feet that buyers are targeting. Right now in your immediate area, housing inventory is sitting at a severe deficit with ${defaultInventory} homes active on the market. We aren't looking to list your home traditionally—we have an immediate inventory gap for your exact property profile. Are you still open to a clean offer if we can match your terms, or have you decided to take the property off the market for good?`;
  }

  if (isDistressed) {
    track += " Our system also flagged that your market profile recently shifted, meaning we can move on an expedited timeline to clear any outstanding balances or terms within a clean 14-day window if that fits your schedule better.";
  }

  if (isAbsentee) {
    track += " Since this is an investment property and currently sitting empty, we can provide a quick, clean exit so you aren't bleeding cash on holding costs.";
  }

  if (yearsOwned !== null && yearsOwned >= 10 && !isDistressed && !isAbsentee) {
    track += ` I see you've owned this property for about ${yearsOwned} years, so you likely have substantial equity built up. This allows us to be very aggressive on our offer price if you're looking to downsize or cash out smoothly.`;
  }

  return track;
}
