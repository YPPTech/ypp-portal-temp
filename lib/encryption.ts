import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // bytes (256 bits)
const IV_LENGTH = 12;  // bytes (96 bits — recommended for GCM)
const TAG_LENGTH = 16; // bytes (128-bit auth tag)

function getKey(): Buffer {
  const hex = process.env.TWO_FACTOR_ENCRYPTION_KEY;
  if (!hex || hex.length < KEY_LENGTH * 2) {
    throw new Error(
      "TWO_FACTOR_ENCRYPTION_KEY is not set or too short. " +
      "Generate one with: openssl rand -hex 32"
    );
  }
  return Buffer.from(hex.slice(0, KEY_LENGTH * 2), "hex");
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns a colon-separated string: iv:tag:ciphertext (all hex-encoded).
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":");
}

/**
 * Decrypt a value produced by `encrypt()`.
 * Throws if the key is wrong or the ciphertext has been tampered with.
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format");
  }

  const [ivHex, tagHex, dataHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const data = Buffer.from(dataHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
