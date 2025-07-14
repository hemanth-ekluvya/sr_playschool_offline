const fs = require("fs");
const path = require("path");
const fse = require("fs-extra");

module.exports = async function (context) {
  const outDir = context.appOutDir;

  const encVideosSrc = path.join(__dirname, "enc_videos");
  const encVideosDest = path.join(outDir, "enc_videos");

  const licenseSrc = path.join(__dirname, "license.key");
  const licenseDest = path.join(outDir, "license.key");

  const debugLogSrc = path.join(__dirname, "debug-log.txt");
  const debugLogDest = path.join(outDir, "debug-log.txt");

  console.log("🔁 Copying enc_videos and license.key to output...");

  try {
    if (fs.existsSync(encVideosSrc)) {
      await fse.copy(encVideosSrc, encVideosDest);
      console.log("✅ enc_videos copied to dist.");
    } else {
      console.warn("⚠️ enc_videos folder not found.");
    }

    if (fs.existsSync(licenseSrc)) {
      await fse.copy(licenseSrc, licenseDest);
      console.log("✅ license.key copied to dist.");
    } else {
      console.warn("⚠️ license.key file not found.");
    }

    if (fs.existsSync(debugLogSrc)) {
      await fse.copy(debugLogSrc, debugLogDest);
      console.log("✅ debug-log.txt copied to dist.");
    }
  } catch (e) {
    console.error("❌ Failed to copy files during afterPack:", e);
    throw e;
  }
};
