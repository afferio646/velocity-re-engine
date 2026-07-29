export function generateTalkTrack(
  ownerName: string,
  address: string,
  dom: string,
  yearBuilt: string,
  squareFootage: string,
  disposition: string,
  yearsOwned: number | null,
  classification: "Maximum" | "High" | "Prime" | "Drop" | "Nurture" | "Anchor" | "Liquidator"
): string {
  // Use first name if possible
  const firstName = ownerName.split(" ")[0] || "there";

  // Format variables cleanly
  const sqftStr = squareFootage !== "N/A" ? squareFootage : "specific";
  const yearStr = yearBuilt !== "N/A" ? yearBuilt : "property";

  // MAXIMUM VELOCITY
  if (classification === "Maximum" || classification === "Liquidator") {
    if (disposition === "Vacant") {
      return `Hi ${firstName}, our system tracked that your vacant property on ${address} recently came off the market. We actively map off-market targets in this area, and your property fits a specific footprint our investor network is looking to absorb. I'm not sure why it didn't move on the retail market, but our buying matrix usually solves those gaps. Are you planning to hold it, or are you open to exploring alternatives to get it off your hands? If so, I'd like to set up a time for one of our lead agents to stop by and see the property to get a clear picture and see if there is a fit with our buying matrix.`;
    } else {
      // Pre-Foreclosure / Lien
      return `Hi ${firstName}, our system flagged your property on ${address} because it matches a specific footprint our buyer network is trying to acquire right now. I know it recently came off the market, we saw the public records showing some potential roadblocks, We can usually help. Our buying matrix is designed to solve complex title or timeline issues whatever the issue is. Are you open to looking at alternatives to get this resolved? If so id like to set a time for one of our lead agents to stop by and see the property so we can see if there is a fit wth our buyers.`;
    }
  }

  // HIGH VELOCITY
  if (classification === "High" || classification === "Anchor") {
    if (disposition === "Corporate Owned") {
      // Use "owner" or company name if first name is just part of a corporate name
      const contactName = ownerName.toLowerCase().includes("llc") || ownerName.toLowerCase().includes("inc") ? "owner" : firstName;
      return `Hi ${contactName}, I'm calling regarding your corporate asset on ${address}. Our system tracks off-market footprints, and we flagged your property because our investors are currently targeting assets in this area. I saw the recent listing didn't close. Are you planning to hold this in your portfolio, or are you open to a direct off-market alternative? I'd like to set up a time for one our lead agents to stop by and see the property to get a clear picture and see if there is a fit with our buying matrix.`;
    } else {
      // Absentee Owner / Tired Landlord
      return `Hi ${firstName}, our system tracked that your investment property on ${address} recently came off the market. We actively map off-market acquisition targets in this area, and your asset fits a specific footprint our investor network is looking to absorb. I'm not sure why it didn't move on the retail market, but our buying matrix usually solves those gaps. Are you planning to hold and tenant the property, or are you open to exploring alternatives? If so, I'd like to set up a time for one of our lead agents to stop by and see the property to get a clear picture and see if there is a fit with our buying matrix.`;
    }
  }

  // PRIME VELOCITY (Owner-Occupied, standard)
  return `Hi ${firstName}, I'm reaching out about ${address}. We monitor specific property profiles in your neighborhood, and your specific footprint is currently in high demand within our buyer network. I know your listing recently expired. I don't know the specifics but our buying strategy usually bridges that gap—even if traditional financing was the hurdle. Are you taking a break from the market, or are you open to alternatives? If you are, I'd love to set up a time for one our lead agents to stop to see the property so we can see if theres fit with our buyers.`;
}
