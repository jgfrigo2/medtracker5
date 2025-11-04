// Using an interface for stricter type checking on the event object.
interface HandlerEvent {
  httpMethod: string;
  body: string | null;
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({ message: 'OPTIONS request handled' }),
    };
  }
  
  // Ensure the request method is POST.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  
  // Ensure the request has a body.
  if (!event.body) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Request body is missing.' }) };
  }

  try {
    const { apiKey, binId, data } = JSON.parse(event.body);

    // Validate that required fields are in the body.
    if (!apiKey || !binId || !data) {
      return { statusCode: 400, body: JSON.stringify({ error: 'apiKey, binId, and data are required in the request body.' }) };
    }

    const API_BASE_URL = 'https://api.jsonbin.io/v3/b';
    const response = await fetch(`${API_BASE_URL}/${binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': apiKey,
        'X-Bin-Versioning': 'false',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    // If the request to JSONbin fails, forward the error.
    if (!response.ok) {
        return {
            statusCode: response.status,
            body: JSON.stringify({ message: result.message || 'Error updating JSONbin' }),
        };
    }

    // On success, return the result from JSONbin.
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Allow any origin to call this function
      },
      body: JSON.stringify(result),
    };
  } catch (err: any) {
    // Handle unexpected server errors.
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
