const JWT_SECRET_KEY = process.env.JWT_SECRET || "calypso-dev-secret-super-secure";
const ENCODER = new TextEncoder();

/**
 * Encodes a string to a Base64 URL Safe string.
 */
function base64UrlEncode(str: string | Uint8Array): string {
    const base64 = typeof str === "string" ? btoa(str) : btoa(String.fromCharCode(...str));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decodes a Base64 URL Safe string.
 */
function base64UrlDecode(str: string): string {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }
    return atob(base64);
}

/**
 * Gets the Web Crypto HMAC key for signing.
 */
async function getCryptoKey(): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
        "raw",
        ENCODER.encode(JWT_SECRET_KEY),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
    );
}

/**
 * Signs a payload generating a JWT token natively using Web Crypto.
 */
export async function signJwt(payload: object, expiresInHours = 24 * 7): Promise<string> {
    const header = { alg: "HS256", typ: "JWT" };
    const exp = Math.floor(Date.now() / 1000) + expiresInHours * 60 * 60;

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify({ ...payload, exp }));

    const dataToSign = ENCODER.encode(`${encodedHeader}.${encodedPayload}`);
    const key = await getCryptoKey();

    const signatureBuffer = await crypto.subtle.sign("HMAC", key, dataToSign);
    const encodedSignature = base64UrlEncode(new Uint8Array(signatureBuffer));

    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * Verifies and decodes a JWT token. Throws if invalid or expired.
 */
export async function verifyJwt<T>(token: string): Promise<T> {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error("Invalid token format");
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const dataToSign = ENCODER.encode(`${encodedHeader}.${encodedPayload}`);

    const key = await getCryptoKey();

    // Convert signature from base64url back to Uint8Array safely for verification
    let base64Sig = encodedSignature.replace(/-/g, '+').replace(/_/g, '/');
    while (base64Sig.length % 4) { base64Sig += '='; }
    const binaryString = atob(base64Sig);
    const signatureBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        signatureBytes[i] = binaryString.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify("HMAC", key, signatureBytes, dataToSign);
    if (!isValid) {
        throw new Error("Invalid signature");
    }

    const payloadStr = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(payloadStr);

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error("Token expired");
    }

    return payload as T;
}
