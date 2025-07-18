const { contextBridge, ipcRenderer } = require("electron");

try {
  console.log("[PRELOAD] Loading preload.js...");

  // 🔹 Video APIs
  contextBridge.exposeInMainWorld("videoAPI", {
    getSubjectsForClass: async (className) => {
      console.log("[PRELOAD] Fetching subjects for:", className);
      const result = await ipcRenderer.invoke("get-subjects", className);
      console.log("[PRELOAD] Subjects fetched:", result);
      return result;
    },

    getTopicsForSubject: async (className, subjectName) => {
      console.log("[PRELOAD] Fetching topics for:", className, subjectName);
      const result = await ipcRenderer.invoke(
        "get-topics",
        className,
        subjectName
      );
      console.log("[PRELOAD] Topics fetched:", result);
      return result;
    },

    getVideosForSubject: async (className, subjectName, topicName = null) => {
      console.log(
        "[PRELOAD] Fetching videos for:",
        className,
        subjectName,
        topicName
      );
      const result = await ipcRenderer.invoke(
        "get-videos",
        className,
        subjectName,
        topicName
      );
      console.log("[PRELOAD] Videos fetched:", result);
      return result;
    },
  });

  // 🔹 Tracking APIs
  contextBridge.exposeInMainWorld("trackingAPI", {
    saveUserInfo: (data) => {
      console.log("[PRELOAD] Sending user info to main:", data);
      ipcRenderer.send("save-user-info", data);
    },
    logVideoPlay: (log) => {
      console.log("[PRELOAD] Logging video play:", log);
      ipcRenderer.send("video-play-log", log);
    },
  });

  // 🔹 User Info API for profile modal
  contextBridge.exposeInMainWorld("electronAPI", {
    getUserInfo: async () => {
      const userInfo = await ipcRenderer.invoke("get-user-info");
      console.log("[PRELOAD] Got user info:", userInfo);
      return userInfo;
    },
  });

  console.log("[PRELOAD] preload.js loaded successfully.");
} catch (err) {
  console.error("❌ [PRELOAD ERROR]", err);
}
