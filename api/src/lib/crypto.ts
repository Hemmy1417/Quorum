import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-cbc";

function deriveKey(uid: string): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || "change-me";
  return scryptSync(uid + secret, "quorum-salt", 32);
}

export function encryptKey(privateKey: string, uid: string): string {
  const key       = deriveKey(uid);
  const iv        = randomBytes(16);
  const cipher    = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(privateKey, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decryptKey(encryptedKey: string, uid: string): string {
  const [ivHex, encHex] = encryptedKey.split(":");
  const key      = deriveKey(uid);
  const iv       = Buffer.from(ivHex, "hex");
  const enc      = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
