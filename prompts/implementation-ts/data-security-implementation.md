
# Data Security — Calypso TypeScript Implementation

> This document is the Calypso TypeScript reference implementation for the [Data Security Blueprint](../blueprints/data-security-blueprint.md). The principles, threat model, and patterns in that document apply equally to other stacks. This document covers the concrete realization using TypeScript, Bun, and the Calypso monorepo layout.

---

## Package Structure

```
/packages/security
  /kms           # KMS client abstraction (Vault, AWS KMS, GCP KMS)
  /crypto        # Encrypt/decrypt, key derivation, signature primitives
  /passkey       # WebAuthn credential registration and assertion
  /jwt           # Token issuance, validation, revocation list
  /audit         # Audit log writer (append-only, signed entries)
  /agent-auth    # Agent shard key issuance and validation
  /phe           # Partial homomorphic encryption wrappers (Buy: node-seal)
```

## Core Interfaces

```typescript
// Key lifecycle
interface KMSClient {
  encrypt(plaintext: Uint8Array, keyId: string): Promise<Uint8Array>;
  decrypt(ciphertext: Uint8Array, keyId: string): Promise<Uint8Array>;
  rotateKey(keyId: string): Promise<{ newKeyId: string }>;
}

// Session key — ephemeral, never serialized
interface SessionKey {
  sign(data: string): Promise<Uint8Array>;
  verify(data: string, signature: Uint8Array): Promise<boolean>;
  destroy(): void; // zeroes key material from memory
}

// Agent shard token
interface AgentToken {
  agentId: string;
  scopes: string[];       // e.g. ['analytics:read', 'schema:read']
  exp: number;            // unix timestamp, max 24h from issuance
  shardKeyId: string;     // KMS key ID scoped to this agent's access set
}

// Analytical event — must be signed before server accepts
interface AnalyticalEvent {
  type: string;
  payload: Record<string, unknown>;
  userId: string;
  timestamp: number;
  signature: string;      // base64url(sessionKey.sign(type + payload + timestamp))
}
```

## Dependency Justification

| Package | Reason to Buy | Justified |
|---|---|---|
| `node-seal` (PHE) | PHE implementation is 10k+ lines of cryptographic C++; DIY is catastrophically error-prone | Yes |
| `snarkjs` (ZKP) | ZK circuit compilation and proof generation; irreplaceable | Yes, when ZKP is required |
| WebAuthn server lib | FIDO2 protocol is complex and security-critical; no DIY | Yes |
| JWT parsing | < 50 lines DIY using `crypto.subtle`; no external dep needed | No — DIY |
| AES-GCM encrypt/decrypt | Web Crypto API (`crypto.subtle`) covers this natively | No — DIY |
| Key derivation (HKDF) | Web Crypto API covers this natively | No — DIY |

All security dependencies are documented in `docs/dependencies.md` with CVE monitoring enabled.

---

## Antipatterns (Web/TypeScript-Specific)

- **Storing session keys in `localStorage`.** `localStorage` is readable by any JavaScript on the page. XSS = full session capture. HttpOnly cookies only.

- **Logging plaintext in error handlers.** A `catch (e) { log(user) }` that dumps the user object will log decrypted PII. Log IDs and error codes only; never log objects containing user fields.
