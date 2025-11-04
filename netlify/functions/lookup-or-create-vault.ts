// This function looks up a user's vault binId based on a hash of their password.
// If the user doesn't exist, it creates a new bin for them and updates the master index.
// This requires two environment variables to be set in Netlify:
// - JSONBIN_API_KEY: A master key for your jsonbin.io account with permissions to read/write bins.
// - MASTER_INDEX_BIN_ID: The ID of the bin you've created to store the user hash -> binId mapping.

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

const API_BASE_URL = 'https://api.jsonbin.io/v3/b';

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

  const { JSONBIN_API_KEY, MASTER_INDEX_BIN_ID } = process.env;

  if (!JSONBIN_API_KEY || !MASTER_INDEX_BIN_ID) {
    console.error('Environment variables not configured.');
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Configuration error on server.' })};
  }
  
  if (!event.body) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Request body is missing.' }) };
  }

  try {
    const { userHash } = JSON.parse(event.body);
    if (!userHash) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'userHash is required.' }) };
    }

    // 1. Fetch the master index bin
    const indexResponse = await fetch(`${API_BASE_URL}/${MASTER_INDEX_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_API_KEY },
    });

    if (!indexResponse.ok) {
        throw new Error('Could not access master index.');
    }

    const masterIndex = (await indexResponse.json()).record || {};

    // 2. Check if user exists
    if (masterIndex[userHash]) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ binId: masterIndex[userHash] }),
      };
    }

    // 3. User does not exist, create a new bin for them
    const createBinResponse = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': JSONBIN_API_KEY,
            'X-Bin-Name': `user-vault-${userHash.substring(0, 8)}`,
            'X-Bin-Private': 'true',
        },
        body: JSON.stringify({ payload: null }), // Start with an empty payload
    });

    if (!createBinResponse.ok) {
        throw new Error('Failed to create a new user vault.');
    }

    const newBinMetadata = await createBinResponse.json();
    const newBinId = newBinMetadata.metadata.id;

    // 4. Update the master index with the new user's binId
    const updatedMasterIndex = {
        ...masterIndex,
        [userHash]: newBinId,
    };
    
    const updateIndexResponse = await fetch(`${API_BASE_URL}/${MASTER_INDEX_BIN_ID}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': JSONBIN_API_KEY,
        },
        body: JSON.stringify(updatedMasterIndex),
    });

    if (!updateIndexResponse.ok) {
        // This is a problematic state, but we can still return the binId to the user.
        // The next login will fix the index.
        console.error('Failed to update master index, but created a bin for the user.');
    }

    // 5. Return the new binId to the client
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ binId: newBinId }),
    };

  } catch (err: any) {
    console.error('Error in lookup-or-create-vault:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: err.message || 'An internal server error occurred.' }),
    };
  }
}