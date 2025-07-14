const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ENCRYPTION_KEY = "1234567890abcdef1234567890abcdef"; // 32 bytes
const IV = "abcdef1234567890"; // 16 bytes

const videosDir = path.join(__dirname, "videos"); // Source
const outputDir = path.join(__dirname, "enc_videos"); // Destination
const debugLogPath = path.join(__dirname, "debug-log.txt");

function debugLog(...args) {
  const log = `[${new Date().toISOString()}] ${args.join(" ")}`;
  console.log(log);
  fs.appendFileSync(debugLogPath, log + "\n");
}

// Encrypt binary file (e.g. .ts)
function encryptBinary(inputPath, outputPath) {
  const data = fs.readFileSync(inputPath);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    Buffer.from(IV)
  );
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  fs.writeFileSync(outputPath, encrypted);
  debugLog("🔒 Encrypted:", inputPath.replace(__dirname + "/", ""));
}

function extractDurationFromM3U8(content) {
  const lines = content.split("\n");
  let total = 0;
  for (const line of lines) {
    if (line.startsWith("#EXTINF:")) {
      const val = parseFloat(line.split(":")[1].replace(",", ""));
      total += val;
    }
  }
  const mins = Math.floor(total / 60);
  const secs = Math.round(total % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function encryptAndRewriteM3U8(inputPath, outputPath) {
  const original = fs.readFileSync(inputPath, "utf-8");
  const updated = original.replace(/\.ts/g, ".ts.enc");
  const duration = extractDurationFromM3U8(original);

  fs.writeFileSync(
    path.join(path.dirname(outputPath), "duration.json"),
    JSON.stringify({ duration }, null, 2)
  );

  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    Buffer.from(IV)
  );
  const encrypted = Buffer.concat([
    cipher.update(updated, "utf-8"),
    cipher.final(),
  ]);
  fs.writeFileSync(outputPath, encrypted);
  debugLog("📄 Encrypted playlist:", inputPath.replace(__dirname + "/", ""));
}

// Copy thumbnail image
function copyThumbnail(src, dest) {
  fs.copyFileSync(src, dest);
  debugLog("🖼️ Copied thumbnail:", src.replace(__dirname + "/", ""));
}

// Recursive encryption
function walkAndEncrypt(inputDir, outputDir) {
  const entries = fs.readdirSync(inputDir);

  for (const entry of entries) {
    const inputPath = path.join(inputDir, entry);
    const outputPath = path.join(outputDir, entry);

    const stat = fs.statSync(inputPath);

    if (stat.isDirectory()) {
      fs.mkdirSync(outputPath, { recursive: true });
      walkAndEncrypt(inputPath, outputPath);
    } else if (entry.endsWith(".ts")) {
      encryptBinary(inputPath, outputPath + ".enc");
    } else if (entry.endsWith(".m3u8")) {
      encryptAndRewriteM3U8(inputPath, outputPath + ".enc");
    } else if (/\.(jpg|jpeg|png)$/i.test(entry)) {
      copyThumbnail(inputPath, outputPath);
    }
  }
}

// Clean and start encryption
function startEncryption() {
  debugLog("🔁 Cleaning output folder...");
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  if (!fs.existsSync(videosDir)) {
    debugLog("❌ Source folder 'videos/' not found.");
    return;
  }

  debugLog("🚀 Starting encryption...");
  walkAndEncrypt(videosDir, outputDir);
  debugLog("✅ All videos encrypted successfully.");
}

// Run it
startEncryption();
