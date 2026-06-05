// Compact AES-256-GCM encryption — optimized for minimal storage
const crypto = require("crypto");
const zlib = require("zlib");

const ALGO = "aes-256-gcm";
const KEY = process.env.ENCRYPTION_KEY || "default-key-change-in-production!!";
const keyBuf = crypto.createHash("sha256").update(KEY).digest();

function encrypt(text) {
  if (!text || typeof text !== "string") return text;
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, keyBuf, iv);
    
    // Compress if text is long (saves space for descriptions)
    const useZip = text.length > 100;
    const input = useZip ? zlib.deflateRawSync(Buffer.from(text, "utf8")) : Buffer.from(text, "utf8");
    
    const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
    const tag = cipher.getAuthTag(); // 16 bytes
    
    // Compact format: flag(1) + iv(12) + tag(16) + ciphertext → base64
    const flag = Buffer.from([useZip ? 1 : 0]);
    const packed = Buffer.concat([flag, iv, tag, encrypted]);
    return "E:" + packed.toString("base64");
  } catch (e) { return text; }
}

function decrypt(text) {
  if (!text || typeof text !== "string" || !text.startsWith("E:")) return text;
  try {
    const packed = Buffer.from(text.slice(2), "base64");
    const useZip = packed[0] === 1;
    const iv = packed.subarray(1, 13);
    const tag = packed.subarray(13, 29);
    const encrypted = packed.subarray(29);
    
    const decipher = crypto.createDecipheriv(ALGO, keyBuf, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    
    return useZip ? zlib.inflateRawSync(decrypted).toString("utf8") : decrypted.toString("utf8");
  } catch (e) { return text; }
}

function decryptFields(obj, fields) {
  if (!obj) return obj;
  const r = typeof obj.toObject === "function" ? obj.toObject() : { ...obj };
  for (const f of fields) { if (r[f]) r[f] = decrypt(r[f]); }
  return r;
}

module.exports = { encrypt, decrypt, decryptFields };
