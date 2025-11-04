interface HandlerEvent {
  httpMethod: string;
  body: string | null;
}

interface HandlerResponse {
  statusCode: number;
  headers?: { [key: string]: string };
  body: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export async function handler(event: HandlerEvent): Promise<HandlerResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'OPTIONS request handled' }),
    };
  }
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: 'Method Not Allowed' };
  }
  
  const { JSONBIN_API_KEY } = process.env;
  if (!JSONBIN_API_KEY) {
    const errorMessage = 'Configuration error on server. Missing environment variable: JSONBIN_API_KEY.';
    console.error(errorMessage);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: errorMessage }) };
  }
  
  if (!event.body) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Request body is missing.' }) };
  }

  try {
    const { binId, data } = JSON.parse(event.body);

    if (!binId || !data) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'binId and data are required in the request body.' }) };
    }

    const API_BASE_URL = 'https://api.jsonbin.io/v3/b';
    const response = await fetch(`${API_BASE_URL}/${binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY,
        'X-Bin-Versioning': 'false',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
        return {
            statusCode: response.status,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: result.message || 'Error updating JSONbin' }),
        };
    }

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message }),
    };
  }
}