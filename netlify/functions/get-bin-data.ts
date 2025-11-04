interface HandlerEvent {
  httpMethod: string;
  queryStringParameters: {
    binId?: string;
  };
}

interface HandlerResponse {
  statusCode: number;
  headers?: { [key: string]: string };
  body: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export async function handler(event: HandlerEvent): Promise<HandlerResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'OPTIONS request handled' }),
    };
  }
  
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: CORS_HEADERS, body: 'Method Not Allowed' };
  }

  const { JSONBIN_API_KEY } = process.env;
  if (!JSONBIN_API_KEY) {
    console.error('JSONBIN_API_KEY environment variable not configured.');
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Configuration error on server.' }) };
  }
  
  const { binId } = event.queryStringParameters;

  if (!binId) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'binId is a required query parameter.' }) };
  }

  try {
    const API_BASE_URL = 'https://api.jsonbin.io/v3/b';
    const response = await fetch(`${API_BASE_URL}/${binId}/latest`, {
      method: 'GET',
      headers: {
        'X-Master-Key': JSONBIN_API_KEY,
        'X-Bin-Versioning': 'false',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: data.message || 'Error fetching from JSONbin' }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
