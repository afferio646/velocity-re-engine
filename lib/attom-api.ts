import axios from "axios";

const ATTOM_API_URL = "https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/expandedprofile";

export async function fetchAttomData(address1: string, address2: string) {
  const apiKey = process.env.ATTOM_API_KEY;

  if (!apiKey) {
    throw new Error("ATTOM_API_KEY is not configured in environment variables");
  }

  try {
    const response = await axios.get(ATTOM_API_URL, {
      headers: {
        accept: "application/json",
        apikey: apiKey,
      },
      params: {
        address1,
        address2,
      },
    });

    if (
      response.data &&
      response.data.property &&
      response.data.property.length > 0
    ) {
      return { data: response.data.property[0], error: null };
    }

    return { data: null, error: "No property data returned from ATTOM for this address." };
  } catch (error: any) {
    console.error(`Error fetching ATTOM data for ${address1}, ${address2}:`, error.response?.data || error.message);
    const errorMessage = error.response?.data?.status?.msg || error.response?.statusText || error.message || "Unknown API Error";
    return { data: null, error: `ATTOM API Error: ${errorMessage}` };
  }
}
