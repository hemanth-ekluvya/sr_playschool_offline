const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("videoAPI", {
  getSubjectsForClass: (className) =>
    ipcRenderer.invoke("get-subjects", className),
  getTopicsForSubject: (className, subjectName) =>
    ipcRenderer.invoke("get-topics", className, subjectName),
  getVideosForSubject: (className, subjectName, topicName = null) =>
    ipcRenderer.invoke("get-videos", className, subjectName, topicName),
});
