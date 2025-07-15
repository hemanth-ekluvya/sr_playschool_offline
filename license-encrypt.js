const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const ENCRYPTION_KEY = "1234567890abcdef1234567890abcdef"; // 32 bytes
const IV = "abcdef1234567890"; // 16 bytes
const SALT = "srschools";

const licensePath = path.join(__dirname, "license.json");
const outputPath = path.join(__dirname, "license.key");

// Encrypt a single UUID
function encryptUUID(uuid) {
  const data = SALT + uuid;
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    Buffer.from(IV)
  );
  let encrypted = cipher.update(data, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}

try {
  const licenseJson = JSON.parse(fs.readFileSync(licensePath, "utf-8"));
  const uuids = licenseJson.allowedUUIDs || [];

  const encryptedList = uuids.map(encryptUUID);

  fs.writeFileSync(outputPath, encryptedList.join("|"), "utf-8");
  console.log("✅ Encrypted license.key created successfully.");
} catch (err) {
  console.error("❌ Error encrypting license:", err.message);
}
