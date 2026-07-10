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
      return response.data.property[0];
    }

    return null;
  } catch (error) {
    console.error(`Error fetching ATTOM data for ${address1}, ${address2}:`, error);
    return null;
  }
}
