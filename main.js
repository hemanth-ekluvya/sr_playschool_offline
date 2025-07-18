const { app, BrowserWindow, dialog, protocol, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { machineIdSync } = require("node-machine-id");

const ENCRYPTION_KEY = "1234567890abcdef1234567890abcdef";
const IV = "abcdef1234567890";
const SALT = "srschools";

const isPackaged = app.isPackaged;
const BASE_PATH = isPackaged ? path.dirname(process.execPath) : __dirname;
const VIDEO_PATH = path.join(BASE_PATH, "enc_videos");
const LICENSE_KEY_PATH = path.join(BASE_PATH, "license.key");
const DEBUG_LOG_PATH = path.join(BASE_PATH, "debug-log.txt");
const TRACKING_LOG_PATH = path.join(BASE_PATH, "tracking.log");
const PUBLIC_PATH = path.join(BASE_PATH, "public");

function debugLog(msg) {
  const log = `[${new Date().toISOString()}] ${msg}`;
  console.log(log);
  fs.appendFileSync(DEBUG_LOG_PATH, log + "\n");
}

let currentUser = null;

function decryptUUID(encUUID) {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    Buffer.from(IV)
  );
  let decrypted = decipher.update(encUUID, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function decryptFile(buffer) {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    IV
  );
  return Buffer.concat([decipher.update(buffer), decipher.final()]);
}

function getMimeType(filePath) {
  if (filePath.endsWith(".m3u8.enc") || filePath.endsWith(".m3u8"))
    return "application/vnd.apple.mpegurl";
  if (filePath.endsWith(".ts.enc") || filePath.endsWith(".ts"))
    return "video/MP2T";
  return "application/octet-stream";
}

async function isAuthorized() {
  try {
    const rawUUID = machineIdSync({ original: true });
    const saltedUUID = SALT + rawUUID;

    debugLog(`📂 BASE_PATH: ${BASE_PATH}`);
    debugLog(`📂 VIDEO_PATH: ${VIDEO_PATH}`);
    debugLog(`🔍 UUID Check: ${rawUUID}`);

    const encData = fs.readFileSync(LICENSE_KEY_PATH, "utf-8");
    const encryptedUUIDs = encData
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);

    let authorized = false;
    for (const enc of encryptedUUIDs) {
      try {
        const decrypted = decryptUUID(enc);
        if (decrypted === saltedUUID) {
          authorized = true;
          break;
        }
      } catch (e) {
        debugLog(`❌ Decryption failed for UUID chunk: ${e.message}`);
      }
    }
    debugLog(authorized ? "✅ Authorized" : "❌ Not authorized");
    return authorized;
  } catch (err) {
    debugLog("❌ License check failed: " + err.message);
    return false;
  }
}

app.whenReady().then(async () => {
  const authorized = await isAuthorized();
  if (!authorized) {
    dialog.showErrorBox(
      "Unauthorized Device",
      "This application requires a valid license key. Contact SR Head Office for support."
    );
    app.quit();
    return;
  }

  protocol.registerBufferProtocol("encfile", (request, respond) => {
    const relativePath = decodeURIComponent(
      request.url.replace("encfile://", "")
    );
    const fullPath = path.join(VIDEO_PATH, relativePath);
    debugLog(`📦 Requested encrypted file: ${fullPath}`);

    try {
      const encrypted = fs.readFileSync(fullPath);
      const decrypted = decryptFile(encrypted);
      respond({ mimeType: getMimeType(fullPath), data: decrypted });
    } catch (err) {
      debugLog(`❌ Decryption failed: ${err.message}`);
      respond({ statusCode: 500 });
    }
  });

  protocol.registerFileProtocol("asset", (request, callback) => {
    const fileUrl = decodeURIComponent(request.url.replace("asset://", ""));
    const finalPath = path.join(PUBLIC_PATH, fileUrl);
    callback({ path: finalPath });
  });

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile("startup.html");

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0)
      win.loadFile("startup.html");
  });
});

app.on("window-all-closed", () => {
  if (currentUser) {
    const log = `[${new Date().toLocaleString()}] USER LOGOUT: ${JSON.stringify(
      currentUser
    )}\n`;
    fs.appendFileSync(TRACKING_LOG_PATH, log, "utf-8");
    currentUser = null;
  }
  if (process.platform !== "darwin") app.quit();
});

app.commandLine.appendSwitch("disable-gpu");

ipcMain.handle("get-subjects", async (event, className) => {
  const classDir = path.join(VIDEO_PATH, className);
  debugLog(`📁 Scanning class: ${classDir}`);

  if (!fs.existsSync(classDir)) {
    debugLog("❌ Class folder not found.");
    return [];
  }

  const subjects = fs.readdirSync(classDir).filter((item) => {
    const fullPath = path.join(classDir, item);
    return fs.statSync(fullPath).isDirectory();
  });

  debugLog(`✅ Subjects: ${subjects.join(", ")}`);
  return subjects;
});

ipcMain.handle("get-topics", async (event, className, subjectName) => {
  const subjectPath = path.join(VIDEO_PATH, className, subjectName);
  debugLog(`📁 Checking topics in: ${subjectPath}`);

  if (!fs.existsSync(subjectPath)) {
    debugLog("❌ Subject folder not found.");
    return [];
  }

  const folders = fs.readdirSync(subjectPath).filter((folder) => {
    const topicPath = path.join(subjectPath, folder);
    if (!fs.statSync(topicPath).isDirectory()) return false;

    const hasPlaylist = fs
      .readdirSync(topicPath)
      .some((f) => f.endsWith(".m3u8.enc"));
    return hasPlaylist;
  });

  debugLog(`📂 Topics found: ${folders.join(", ")}`);
  return folders;
});

function findVideoFoldersRecursively(basePath) {
  const videoFolders = [];
  function traverse(currentPath) {
    if (!fs.existsSync(currentPath)) return;

    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        const hasPlaylist = fs
          .readdirSync(fullPath)
          .some((f) => f.endsWith(".m3u8.enc"));
        if (hasPlaylist) {
          videoFolders.push(fullPath);
        } else {
          traverse(fullPath);
        }
      }
    }
  }
  traverse(basePath);
  return videoFolders;
}

ipcMain.handle(
  "get-videos",
  async (event, className, subjectName, topicName) => {
    const rootPath = topicName
      ? path.join(VIDEO_PATH, className, subjectName, topicName)
      : path.join(VIDEO_PATH, className, subjectName);

    debugLog(`📂 Recursive scan in: ${rootPath}`);

    const folders = findVideoFoldersRecursively(rootPath);
    const results = [];

    for (const folderPath of folders) {
      try {
        const files = fs.readdirSync(folderPath);
        const playlist = files.find((f) => f.endsWith(".m3u8.enc"));
        if (!playlist) continue;

        const durationPath = path.join(folderPath, "duration.json");
        const thumbnailFile = files.find((f) => /\.(jpg|jpeg|png)$/i.test(f));

        let duration = "N/A";
        if (fs.existsSync(durationPath)) {
          try {
            const durationData = JSON.parse(
              fs.readFileSync(durationPath, "utf-8")
            );
            duration = durationData.duration || "N/A";
          } catch (err) {
            debugLog(
              `❌ Failed to parse duration in ${folderPath}: ${err.message}`
            );
          }
        }

        const relativePath = path.relative(
          VIDEO_PATH,
          path.join(folderPath, playlist)
        );

        results.push({
          title: path.basename(folderPath).replace(/_/g, " "),
          duration,
          src: `encfile://${encodeURIComponent(
            relativePath.replace(/\\/g, "/")
          )}`,
          thumbnail: thumbnailFile
            ? `file://${path.join(folderPath, thumbnailFile)}`
            : "default.jpg",
        });
      } catch (err) {
        debugLog(`❌ Failed in folder ${folderPath}: ${err.message}`);
      }
    }

    debugLog(`🎬 Videos found: ${results.length}`);
    results.forEach((v) =>
      debugLog(`✅ ${v.title} - ${v.duration} - ${v.src}`)
    );
    return results;
  }
);

ipcMain.on("save-user-info", (event, data) => {
  currentUser = data;
  const log = `[${new Date().toLocaleString()}] USER LOGIN: ${JSON.stringify(
    currentUser
  )}\n`;
  fs.appendFileSync(TRACKING_LOG_PATH, log, "utf-8");
});

ipcMain.handle("get-user-info", () => {
  return currentUser || {};
});

ipcMain.on("video-play-log", (event, { title, startTime, endTime }) => {
  const log = `[${title}] [${startTime} to ${endTime}]\n`;
  fs.appendFileSync(TRACKING_LOG_PATH, log, "utf-8");
});

app.on("window-all-closed", () => {
  if (currentUser) {
    const log = `[${new Date().toLocaleString()}] USER LOGOUT: ${JSON.stringify(
      currentUser
    )}\n`;
    fs.appendFileSync(TRACKING_LOG_PATH, log, "utf-8");
    currentUser = null;
  }
  if (process.platform !== "darwin") app.quit();
});
