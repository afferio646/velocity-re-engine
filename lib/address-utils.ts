/**
 * Splits a full address string at the first comma.
 * Example: "123 Main St, Fort Wayne, IN 46804" ->
 * { address1: "123 Main St", address2: "Fort Wayne, IN 46804" }
 */
export function splitAddress(fullAddress: string): { address1: string; address2: string } | null {
  if (!fullAddress) return null;

  const firstCommaIndex = fullAddress.indexOf(',');
  if (firstCommaIndex === -1) {
    return { address1: fullAddress.trim(), address2: '' };
  }

  const address1 = fullAddress.substring(0, firstCommaIndex).trim();
  const address2 = fullAddress.substring(firstCommaIndex + 1).trim();

  return { address1, address2 };
}
