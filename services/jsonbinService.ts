import type { AppState } from '../types';
import { encrypt, decrypt } from './cryptoService';

interface EncryptedPayload {
  payload: string;
}

// --- Raw fetchers ---
const getRawBinData = async (binId: string): Promise<any> => {
  const response = await fetch(`/.netlify/functions/get-bin-data?binId=${encodeURIComponent(binId)}`, {
    method: 'GET',
  });

  if (!response.ok) {
    // If bin is not found (404), return null instead of throwing, useful for new users.
    if (response.status === 404) {
      return null;
    }
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al obtener los datos desde el servidor.');
  }
  
  // The free tier of jsonbin wraps the response in a "record" object.
  const data = await response.json();
  return data.record || data;
};

const updateRawBinData = async (binId: string, data: any): Promise<void> => {
  const response = await fetch(`/.netlify/functions/update-bin-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ binId, data }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al guardar los datos en el servidor.');
  }
};


// --- Encrypted Data Service ---

export const getEncryptedAppState = async (binId: string, password: string): Promise<AppState | null> => {
  const data = await getRawBinData(binId);

  // If data is null or doesn't have an encrypted payload, it's a new or empty bin.
  if (!data || !data.payload) {
    return null;
  }

  try {
    const decryptedJson = await decrypt(data.payload, password);
    return JSON.parse(decryptedJson) as AppState;
  } catch (e) {
    console.error("Decryption failed:", e);
    // This typically means the password was incorrect.
    throw new Error("Contraseña incorrecta o datos corruptos.");
  }
};

export const updateEncryptedAppState = async (binId: string, password: string, state: AppState): Promise<void> => {
  const encryptedPayload = await encrypt(JSON.stringify(state), password);
  const dataToSave: EncryptedPayload = { payload: encryptedPayload };
  await updateRawBinData(binId, dataToSave);
};

export const lookupOrCreateVault = async (userHash: string): Promise<string> => {
  const response = await fetch('/.netlify/functions/lookup-or-create-vault', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userHash }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'No se pudo contactar con el servicio de sincronización.');
  }

  const data = await response.json();
  return data.binId;
};