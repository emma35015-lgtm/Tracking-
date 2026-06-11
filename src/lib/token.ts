import { createHash, randomBytes } from "node:crypto";

// El token en texto plano se muestra una sola vez; en la BD solo guardamos el hash.
export function generateToken(): string {
  return "gst_" + randomBytes(24).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
