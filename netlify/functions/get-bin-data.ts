// Using an interface for stricter type checking on the event object.
interface HandlerEvent {
  httpMethod: string;
  queryStringParameters: {
    apiKey?: string;
    binId?: string;
  };
}

// Using an interface for the response object.
interface HandlerResponse {
  statusCode: number;
  headers?: { [key: string]: string };
  body: string;
}

// Netlify function handler.
export async function handler(event: HandlerEvent): Promise<HandlerResponse> {
  // Handle CORS preflight requests from local development environments.
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
      body: JSON.stringify({ message: 'OPTIONS request handled' }),
    };
  }
  
  // Ensure the request method is GET.
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Extract API key and Bin ID from query parameters.
  const { apiKey, binId } = event.queryStringParameters;

  // Validate that required parameters are present.
  if (!apiKey || !binId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'apiKey and binId are required query parameters.' }) };
  }

  try {
    const API_BASE_URL = 'https://api.jsonbin.io/v3/b';
    const response = await fetch(`${API_BASE_URL}/${binId}/latest`, {
      method: 'GET',
      headers: {
        'X-Master-Key': apiKey,
        'X-Bin-Versioning': 'false',
      },
    });

    const data = await response.json();

    // If the request to JSONbin fails, forward the error.
    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ message: data.message || 'Error fetching from JSONbin' }),
      };
    }

    // On success, return the fetched data.
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Allow any origin to call this function
      },
      body: JSON.stringify(data),
    };
  } catch (err: any) {
    // Handle unexpected server errors.
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
