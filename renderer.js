// renderer.js

let currentLang = 'en'; // Can dynamically change based on user in future

// Load language file
fetch("lang.json")
  .then(res => res.json())
  .then(langData => {
    document.getElementById("title").innerText = langData[currentLang].offline_player;
    document.querySelector(".sidebar h2").innerText = langData[currentLang].select_class;
  });

// Load video metadata
fetch("videos.json")
  .then(res => res.json())
  .then(data => {
    const list = document.getElementById("videoList");
    data.forEach(video => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <img src="${video.thumbnail}" />
        <h4>${video.title}</h4>
        <p>${video.subject}</p>
      `;
      card.onclick = () => openPlayer(video.videoPath);
      list.appendChild(card);
    });
  });

// Open Video Player
function openPlayer(src) {
  const playerModal = document.getElementById("playerModal");
  playerModal.style.display = "flex";

  const videoEl = document.getElementById("videoPlayer");
  if (videojs.getPlayer('videoPlayer')) {
    videojs('videoPlayer').dispose();
  }
  videoEl.outerHTML = `<video id="videoPlayer" class="video-js vjs-default-skin" controls autoplay>
    <source src="${src}" type="application/x-mpegURL">
  </video>`;
  videojs('videoPlayer');
}

// Close Player
function closePlayer() {
  const modal = document.getElementById("playerModal");
  modal.style.display = "none";
  if (videojs.getPlayer('videoPlayer')) {
    videojs('videoPlayer').dispose();
  }
}
