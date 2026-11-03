// client/src/api/crypto.js
// Client-side Hybrid Encryption module (Web Crypto API: RSA-OAEP SHA-256 + AES-256-GCM)
import { getApiUrl } from './config.js';

const KEY_ID = 'server-rsa-v1';
const PROTOCOL_VERSION = 1;

const EMBEDDED_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAv/ulx82K5Eh3Xs3Kgvno
keSZisMgUk9hw/9sLeNyDAPnV2GyUAGd4WxhJnkrGylQ3qRVVyI+t6NVNuJLMp2P
eg1Oa2yvL7IwZFOZ9iOdpO7DgJB8ebnvTDxqIxzRXHd3toCnM0OJJ1V2Ca4P212X
Y6FAgW9g8IJTqXGFNnTCQpxyuV9D1R3cxhMPkTtsgKpu+8vf8ECHOlC3LgcVyrzg
GH3ZpTm99WV1zHMJ1KBFR2P5ZlxImhyGyYFV1r54VChW11KP96Ee93XFcv++LfRG
akaiZg/Jt8dLWQnGH1QpGcZLQC4CkA9OL+uUsRlVUjB72N3QVmInliN9zymTcuPz
JQIDAQAB
-----END PUBLIC KEY-----`;

let cachedPublicKey = null;

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function bufferToBase64Url(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function pemToSpkiDer(pem) {
  const pemHeader = '-----BEGIN PUBLIC KEY-----';
  const pemFooter = '-----END PUBLIC KEY-----';
  const cleanPem = pem
    .substring(pem.indexOf(pemHeader) + pemHeader.length, pem.indexOf(pemFooter))
    .replace(/\s+/g, '');
  return base64ToUint8Array(cleanPem).buffer;
}

export async function getLoadedServerPublicKey() {
  if (cachedPublicKey) {
    return cachedPublicKey;
  }

  let pemText = '';
  try {
    const res = await fetch(getApiUrl('/keys/server-public.pem'), { cache: 'force-cache', credentials: 'include' });
    if (res.ok) {
      pemText = await res.text();
    }
  } catch (err) {
    // If fetch fails, fall back to embedded public key
  }

  if (!pemText || !pemText.includes('BEGIN PUBLIC KEY')) {
    pemText = EMBEDDED_PUBLIC_KEY_PEM;
  }

  const derBuffer = pemToSpkiDer(pemText);

  const subtle = (typeof window !== 'undefined' ? window.crypto?.subtle : null) || globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto API (crypto.subtle) is not available');
  }

  cachedPublicKey = await subtle.importKey(
    'spki',
    derBuffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['wrapKey', 'encrypt']
  );

  return cachedPublicKey;
}

/**
 * Encrypts an inner business payload into the standard encrypted request envelope.
 */
export async function encryptRequestPayload(payload) {
  const cryptoObj = (typeof window !== 'undefined' ? window.crypto : null) || globalThis.crypto;
  const subtle = cryptoObj?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto API is required for secure request encryption');
  }

  const rsaPubKey = await getLoadedServerPublicKey();

  // 1. Generate ephemeral 256-bit AES-GCM key
  const aesKey = await subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // 2. Generate random 96-bit (12-byte) IV
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));

  // 3. Generate random 128-bit (16-byte) one-time nonce
  const nonceBytes = cryptoObj.getRandomValues(new Uint8Array(16));
  const nonce = bufferToBase64Url(nonceBytes);

  // 4. Server-aligned timestamp in seconds
  const timestamp = Math.floor(Date.now() / 1000);

  // 5. Canonical Additional Authenticated Data (bound to AES-GCM)
  const aadString = `v1|${KEY_ID}|${timestamp}|${nonce}`;
  const aad = new TextEncoder().encode(aadString);

  // 6. Wrap AES key with server's RSA public key using RSA-OAEP SHA-256
  const wrappedKeyBuffer = await subtle.wrapKey(
    'raw',
    aesKey,
    rsaPubKey,
    { name: 'RSA-OAEP', hash: 'SHA-256' }
  );

  // 7. Encrypt inner payload JSON using AES-256-GCM
  const plaintextBytes = new TextEncoder().encode(JSON.stringify(payload));
  const encryptedWithTag = await subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 },
    aesKey,
    plaintextBytes
  );

  // Web Crypto appends the 16-byte tag to the ciphertext
  const encArray = new Uint8Array(encryptedWithTag);
  const ciphertextBytes = encArray.slice(0, encArray.length - 16);
  const tagBytes = encArray.slice(encArray.length - 16);

  // 8. Assemble inner package & base64url encode it
  const innerPackage = {
    wrapped_key: bufferToBase64Url(wrappedKeyBuffer),
    iv: bufferToBase64Url(iv),
    tag: bufferToBase64Url(tagBytes),
    ciphertext: bufferToBase64Url(ciphertextBytes)
  };

  const encryptedString = bufferToBase64Url(new TextEncoder().encode(JSON.stringify(innerPackage)));

  return {
    version: PROTOCOL_VERSION,
    key_id: KEY_ID,
    timestamp,
    nonce,
    encrypted: encryptedString
  };
}
