// --- Helper functions for encoding/decoding ---
// FIX: The type of `buffer` should be `BufferSource` to accept both ArrayBuffer and Uint8Array, improving type safety.
const b64encode = (buffer: BufferSource) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
// FIX: Changed to return Uint8Array instead of ArrayBuffer to fix a type error in `deriveKey` call within the `decrypt` function.
const b64decode = (str: string) => Uint8Array.from(atob(str), c => c.charCodeAt(0));

// --- Hashing ---
export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// --- Key Derivation ---
const deriveKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
};

// --- Encryption ---
export const encrypt = async (data: string, password: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  );

  // Package salt, iv, and ciphertext together for storage
  return JSON.stringify({
    salt: b64encode(salt),
    iv: b64encode(iv),
    ciphertext: b64encode(ciphertext),
  });
};

// --- Decryption ---
export const decrypt = async (encryptedData: string, password: string): Promise<string> => {
  const { salt: b64salt, iv: b64iv, ciphertext: b64ciphertext } = JSON.parse(encryptedData);
  const salt = b64decode(b64salt);
  const iv = b64decode(b64iv);
  const ciphertext = b64decode(b64ciphertext);
  
  const key = await deriveKey(password, salt);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
};