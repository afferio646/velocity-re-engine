export function generateEmailTrack(
  ownerName: string,
  address: string,
  disposition: string
): string {
  const firstName = ownerName.split(" ")[0] || "there";

  if (disposition === "Vacant") {
    return `Subject: Off-Market Interest: ${address}\n\nHi ${firstName},\n\nOur system tracked that your vacant property on ${address} recently came off the market. We actively map off-market targets in this area, and your property fits a specific footprint our investor network is looking to absorb.\n\nI'm not sure why it didn't move on the retail market, but our buying matrix usually solves those gaps. Are you planning to hold it, or are you open to exploring alternatives to get it off your hands?\n\nIf so, I'd like to set up a time for one of our lead agents to stop by and see the property to get a clear picture and see if there is a fit with our buying matrix.\n\nBest,\n[Your Name]`;
  }

  if (disposition === "Pre-Foreclosure / Lien") {
    return `Subject: Important inquiry regarding ${address}\n\nHi ${firstName},\n\nOur system flagged your property on ${address} because it matches a specific footprint our buyer network is trying to acquire right now. I know it recently came off the market, and we saw the public records showing some potential roadblocks. We can usually help.\n\nOur buying matrix is designed to solve complex title or timeline issues, whatever the issue is. Are you open to looking at alternatives to get this resolved?\n\nIf so, I'd like to set a time for one of our lead agents to stop by and see the property so we can see if there is a fit with our buyers.\n\nBest,\n[Your Name]`;
  }

  if (disposition === "Corporate Owned") {
    const contactName = ownerName.toLowerCase().includes("llc") || ownerName.toLowerCase().includes("inc") ? "owner" : firstName;
    return `Subject: Corporate Asset Inquiry: ${address}\n\nHi ${contactName},\n\nI'm reaching out regarding your corporate asset on ${address}. Our system tracks off-market footprints, and we flagged your property because our investors are currently targeting assets in this area.\n\nI saw the recent listing didn't close. Are you planning to hold this in your portfolio, or are you open to a direct off-market alternative?\n\nI'd like to set up a time for one of our lead agents to stop by and see the property to get a clear picture and see if there is a fit with our buying matrix.\n\nBest,\n[Your Name]`;
  }

  if (disposition === "Absentee Owner / Tired Landlord") {
    return `Subject: Investment Property Inquiry: ${address}\n\nHi ${firstName},\n\nOur system tracked that your investment property on ${address} recently came off the market. We actively map off-market acquisition targets in this area, and your asset fits a specific footprint our investor network is looking to absorb.\n\nI'm not sure why it didn't move on the retail market, but our buying matrix usually solves those gaps. Are you planning to hold and tenant the property, or are you open to exploring alternatives?\n\nIf so, I'd like to set up a time for one of our lead agents to stop by and see the property to get a clear picture and see if there is a fit with our buying matrix.\n\nBest,\n[Your Name]`;
  }

  // PRIME VELOCITY (Owner-Occupied, standard)
  return `Subject: Quick question about ${address}\n\nHi ${firstName},\n\nI'm reaching out about ${address}. We monitor specific property profiles in your neighborhood, and your specific footprint is currently in high demand within our buyer network.\n\nI know your listing recently expired. I don't know the specifics but our buying strategy usually bridges that gap—even if traditional financing was the hurdle. Are you taking a break from the market, or are you open to alternatives?\n\nIf you are, I'd love to set up a time for one of our lead agents to stop by to see the property so we can see if there's a fit with our buyers.\n\nBest,\n[Your Name]`;
}
