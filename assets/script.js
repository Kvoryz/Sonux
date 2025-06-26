class MusicPlayer {
  constructor() {
    this.songs = [];
    this.currentSongIndex = 0;
    this.isPlaying = false;
    this.isShuffled = false;
    this.isNextButtonPressed = false;
    this.prevSongThreshold = 5;
    this.lastSongStartTime = 0;
    this.ignoreSeekThreshold = 2000;
    this.repeatMode = 0;
    this.shuffledIndices = [];
    this.currentShuffleIndex = 0;
    this.audioPlayer = document.getElementById("audioPlayer");
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.source = null;
    this.animationId = null;

    // DOM elements
    this.playBtn = document.getElementById("playBtn");
    this.prevBtn = document.getElementById("prevBtn");
    this.nextBtn = document.getElementById("nextBtn");
    this.shuffleBtn = document.getElementById("shuffleBtn");
    this.repeatBtn = document.getElementById("repeatBtn");
    this.songTitle = document.getElementById("songTitle");
    this.artistName = document.getElementById("artistName");
    this.albumArt = document.getElementById("albumArt");
    this.backgroundBlur = document.getElementById("backgroundBlur");
    this.progress = document.getElementById("progress");
    this.progressBar = document.getElementById("progressBar");
    this.currentTimeEl = document.getElementById("currentTime");
    this.durationEl = document.getElementById("duration");
    this.playlistContainer = document.getElementById("playlistContainer");
    this.playlist = document.getElementById("playlist");
    this.burgerMenu = document.getElementById("burgerMenu");
    this.playlistTrigger = document.getElementById("playlistTrigger");
    this.visualizer = document.getElementById("visualizer");
    this.body = document.body;

    this.backgroundChangeInterval = null;
    this.backgroundImages = [
      "./image/background.jpg",
      "./image/background2.jpg",
      "./image/background3.jpg",
      "./image/background4.jpg",
      "./image/background5.jpg",
    ];
    this.currentBackgroundIndex = 0;
    this.backgroundPreloader = new Image();

    this.playlistVisible = false;
    this.playlistHovered = false;
    this.triggerHovered = false;

    this.init();
  }

  async init() {
    await this.loadMusicFiles();
    this.setupEventListeners();
    this.setupAudioEvents();
    this.initializeBackground();
    this.setupVisualizer();
    if (this.songs.length > 0) {
      this.updateSongDisplay();
      this.generateShuffledIndices();
    }
  }

  setupVisualizer() {
    this.visualizer.innerHTML = "";
    const barCount = 32;
    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement("div");
      bar.className = "visualizer-bar";
      bar.style.height = `${Math.random() * 20 + 2}px`;
      this.visualizer.appendChild(bar);
    }

    this.visualizerBars = Array.from(
      this.visualizer.querySelectorAll(".visualizer-bar")
    );
  }

  setupAudioAnalysis() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.source = this.audioContext.createMediaElementSource(
        this.audioPlayer
      );
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }

    if (this.isPlaying) {
      this.animateVisualizer();
    }
  }

  animateVisualizer() {
    if (!this.analyser) return;

    this.analyser.getByteFrequencyData(this.dataArray);

    const binSkip = Math.floor(
      this.dataArray.length / this.visualizerBars.length
    );

    for (let i = 0; i < this.visualizerBars.length; i++) {
      const mirrorIndex = this.visualizerBars.length - 1 - i;
      const value =
        (this.dataArray[i * binSkip] + this.dataArray[mirrorIndex * binSkip]) /
          2 || 0;
      const height = Math.pow(value / 255, 0.7) * 80 + 2;
      const currentHeight =
        parseFloat(this.visualizerBars[i].style.height) || 2;
      const newHeight = currentHeight * 0.6 + height * 0.4;

      this.visualizerBars[i].style.height = `${newHeight}px`;
      this.visualizerBars[mirrorIndex].style.height = `${newHeight}px`;

      if (newHeight > 15) {
        this.visualizerBars[i].classList.add("active");
        this.visualizerBars[mirrorIndex].classList.add("active");
      } else {
        this.visualizerBars[i].classList.remove("active");
        this.visualizerBars[mirrorIndex].classList.remove("active");
      }
    }

    this.animationId = requestAnimationFrame(() => this.animateVisualizer());
  }

  stopVisualizer() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.visualizerBars) {
      this.visualizerBars.forEach((bar) => {
        bar.style.height = "2px";
        bar.classList.remove("active");
      });
    }
  }

  async initializeBackground() {
    if (this.backgroundImages.length > 0) {
      this.backgroundPreloader.src = this.backgroundImages[0];
      this.backgroundPreloader.onload = () => {
        this.backgroundBlur.style.backgroundImage = `url(${this.backgroundImages[0]})`;
        this.startBackgroundRotation();
      };
    }
  }

  startBackgroundRotation() {
    this.updateBackground();
    this.backgroundChangeInterval = setInterval(() => {
      this.updateBackground();
    }, 20000);
  }

  updateBackground() {
    if (this.backgroundImages.length === 0) return;

    const nextIndex =
      (this.currentBackgroundIndex + 1) % this.backgroundImages.length;
    const nextImage = new Image();
    nextImage.src = this.backgroundImages[nextIndex];

    nextImage.onload = () => {
      this.backgroundBlur.style.backgroundImage = `url(${
        this.backgroundImages[this.currentBackgroundIndex]
      })`;
      this.currentBackgroundIndex = nextIndex;
    };
  }

  generateShuffledIndices() {
    this.shuffledIndices = [...Array(this.songs.length).keys()];
    for (let i = this.shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffledIndices[i], this.shuffledIndices[j]] = [
        this.shuffledIndices[j],
        this.shuffledIndices[i],
      ];
    }
    this.currentShuffleIndex = this.shuffledIndices.indexOf(
      this.currentSongIndex
    );
  }

  toggleShuffle() {
    if (!this.isShuffled && this.repeatMode !== 0) {
      this.repeatMode = 0;
      this.repeatBtn.classList.remove("active");
      this.repeatBtn.title = "Repeat Off";
      this.repeatBtn.querySelector("i").className = "fas fa-repeat";
    }

    this.isShuffled = !this.isShuffled;
    this.shuffleBtn.classList.toggle("active", this.isShuffled);

    if (this.isShuffled) {
      this.generateShuffledIndices();
    }
  }

  toggleRepeat() {
    if (this.repeatMode === 0 && this.isShuffled) {
      this.isShuffled = false;
      this.shuffleBtn.classList.remove("active");
    }

    this.repeatMode = (this.repeatMode + 1) % 3;

    const icon = this.repeatBtn.querySelector("i");

    switch (this.repeatMode) {
      case 0:
        icon.className = "fas fa-repeat";
        this.repeatBtn.classList.remove("active");
        this.repeatBtn.title = "Repeat Off";
        break;
      case 1:
        icon.className = "fas fa-repeat";
        this.repeatBtn.classList.add("active");
        this.repeatBtn.title = "Repeat One";
        break;
      case 2:
        icon.className = "fas fa-arrow-right";
        this.repeatBtn.classList.add("active");
        this.repeatBtn.title = "Play Once";
        break;
    }
  }

  async loadMusicFiles() {
    try {
      const musicFiles = [
        {
          file: "CAS - Apocalypse.mp3",
          albumArt: "./image/album/cas.jpeg",
        },
        {
          file: "CAS - Cry.mp3",
          albumArt: "./image/album/cas.jpeg",
        },
        {
          file: "CAS - K..mp3",
          albumArt: "./image/album/cas.jpeg",
        },
        {
          file: "CAS - Sunsetz.mp3",
          albumArt: "./image/album/cas.jpeg",
        },
        {
          file: "Chezile - Beanie.mp3",
          albumArt: "./image/album/chezile.jpeg",
        },
        {
          file: "The Lantis - Bunga Maaf.mp3",
          albumArt: "./image/album/lantis.webp",
        },
        {
          file: "James Arthur - Car's Outside.mp3",
          albumArt: "./image/album/james.jpeg",
        },
        {
          file: "Mac DeMarco - Chamber Of Reflection.mp3",
          albumArt: "./image/album/mac.jpg",
        },
        {
          file: "Mac DeMarco - Moonlight On The River.mp3",
          albumArt: "./image/album/mac.jpg",
        },
        {
          file: "Coldplay - Trouble.mp3",
          albumArt: "./image/album/cold.jpeg",
        },
        {
          file: "Coldplay - Yellow.mp3",
          albumArt: "./image/album/cold.jpeg",
        },
        {
          file: "Sombr - Back to friends.mp3",
          albumArt: "./image/album/sombr.jpeg",
        },
        {
          file: "Henry Moodie - Drunk text.mp3",
          albumArt: "./image/album/henry.jpeg",
        },
        {
          file: "Yaeow - Favorite lesson.mp3",
          albumArt: "./image/album/yaeow.jpeg",
        },
        {
          file: "d4vd - Here With Me.mp3",
          albumArt: "./image/album/d4vd.jpeg",
        },
        {
          file: "d4vd - Romantic Homicide.mp3",
          albumArt: "./image/album/d4vd.jpeg",
        },
        {
          file: "Goo Goo Dolls - Iris.mp3",
          albumArt: "./image/album/goo.jpg",
        },
        {
          file: "RadioHead - Let Down.mp3",
          albumArt: "./image/album/radio.jpeg",
        },
        {
          file: "Feast - Nina.mp3",
          albumArt: "./image/album/feast.jpeg",
        },
        {
          file: "Feast - o,Tuan.mp3",
          albumArt: "./image/album/feast.jpeg",
        },
        {
          file: "Umay, Natania - Perayaan mati rasa.mp3",
          albumArt: "./image/album/umay.png",
        },
        {
          file: "Wave to earth - Seasons.mp3",
          albumArt: "./image/album/wave.jpeg",
        },
        {
          file: "Nuh.. - Teruntuk Mia.mp3",
          albumArt: "./image/album/nuh.png",
        },
        {
          file: "HYBS - Tip Toe.mp3",
          albumArt: "./image/album/hybs.jpeg",
        },
        {
          file: "Telephones - Vacations.mp3",
          albumArt: "./image/album/tele.png",
        },
        {
          file: "FUR - Walking Back Home.mp3",
          albumArt: "./image/album/fur.jpeg",
        },
        {
          file: "Dream, ivory - Welcome and Goodbye.mp3",
          albumArt: "./image/album/dream.jpeg",
        },
        {
          file: "Zach Templar - Missin something.mp3",
          albumArt: "./image/album/zach.jpeg",
        },
        {
          file: "Steve Lacy - Bad Habit.mp3",
          albumArt: "./image/album/steve.jpg",
        },
        {
          file: "Arctic Monkeys - I Wanna Be Yours (Instrumental).mp3",
          albumArt: "./image/album/am.png",
        },
        {
          file: "Sheila on 7 - Dan.mp3",
          albumArt: "./image/album/sheila.jpg",
        },
        {
          file: "Sheila on 7 - Film Favorit.mp3",
          albumArt: "./image/album/sheila.jpg",
        },
        {
          file: "Sheila On 7 - Sebuah Kisah Klasik.mp3",
          albumArt: "./image/album/sheila.jpg",
        },
      ];

      this.songs = [];

      for (const item of musicFiles) {
        try {
          const fileName = item.file;
          const filePath = "./music/" + fileName;
          const testAudio = new Audio();

          await new Promise((resolve, reject) => {
            testAudio.addEventListener("loadedmetadata", resolve);
            testAudio.addEventListener("error", reject);
            testAudio.src = filePath;
          });

          const songName = fileName.replace(/\.[^/.]+$/, "");
          const artistName = this.extractArtistFromFilename(songName);

          this.songs.push({
            title: this.formatSongTitle(songName),
            artist: artistName,
            src: filePath,
            duration: testAudio.duration,
            fileName: fileName,
            albumArt: item.albumArt || "./image/pfp.jpg",
          });
        } catch (error) {
          console.log(`Could not load ${item.file}:`, error.message);
        }
      }

      if (this.songs.length === 0) {
        this.playlistContainer.innerHTML = `
                <div class="error">
                  No music files found in ./music/ folder.<br>
                  Please add MP3 files to the music folder.
                </div>
              `;
        return;
      }

      this.renderPlaylist();
      console.log(`Loaded ${this.songs.length} songs:`, this.songs);
    } catch (error) {
      console.error("Error loading music files:", error);
      this.playlistContainer.innerHTML = `
              <div class="error">
                Error loading music files.<br>
                Make sure the music folder exists and contains audio files.
              </div>
            `;
    }
  }

  extractArtistFromFilename(filename) {
    const separators = [" - ", " _ ", "_", "-"];
    for (const sep of separators) {
      if (filename.includes(sep)) {
        return filename.split(sep)[0].trim();
      }
    }
    return "Unknown Artist";
  }

  formatSongTitle(filename) {
    const separators = [" - ", " _ ", "_", "-"];
    for (const sep of separators) {
      if (filename.includes(sep)) {
        return filename.split(sep).slice(1).join(sep).trim();
      }
    }
    return filename
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  renderPlaylist() {
    const playlistHTML = this.songs
      .map((song, index) => {
        return `
                <div class="playlist-item ${
                  index === this.currentSongIndex ? "active" : ""
                }" data-index="${index}">
                  <div class="album-art-small" style="background-image: url('${
                    song.albumArt
                  }')"></div>
                  <div class="playlist-item-info">
                    <div class="playlist-item-title">${song.title}</div>
                    <div class="playlist-item-artist">${song.artist}</div>
                  </div>
                </div>
              `;
      })
      .join("");

    this.playlistContainer.innerHTML = playlistHTML;

    this.playlistContainer
      .querySelectorAll(".playlist-item")
      .forEach((item) => {
        item.addEventListener("click", (e) => {
          const index = parseInt(e.currentTarget.dataset.index);
          this.selectSong(index);
          if (window.innerWidth <= 768) {
            this.togglePlaylist();
          }
        });
      });
  }

  formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  updateSongDisplay() {
    if (this.songs.length === 0) return;

    const song = this.songs[this.currentSongIndex];
    this.songTitle.textContent = song.title;
    this.artistName.textContent = song.artist;

    this.albumArt.style.backgroundImage = `url('${song.albumArt}')`;
    this.albumArt.style.backgroundSize = "cover";
    this.albumArt.style.backgroundPosition = "center";
    this.albumArt.textContent = "";

    this.durationEl.textContent = this.formatTime(song.duration);

    this.playlistContainer
      .querySelectorAll(".playlist-item")
      .forEach((item, index) => {
        item.classList.toggle("active", index === this.currentSongIndex);
      });
  }

  async selectSong(index) {
    if (index < 0 || index >= this.songs.length) return;

    const wasPlaying = this.isPlaying;

    if (this.isPlaying) {
      this.pause();
    }

    this.currentSongIndex = index;

    if (this.isShuffled) {
      this.currentShuffleIndex = this.shuffledIndices.indexOf(index);
    }

    const song = this.songs[this.currentSongIndex];
    this.audioPlayer.src = song.src;
    this.updateSongDisplay();

    if (this.audioContext && this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
    this.setupAudioAnalysis();

    if (wasPlaying) {
      try {
        await this.audioPlayer.play();
        this.isPlaying = true;
        this.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        this.animateVisualizer();
      } catch (error) {
        console.error("Error playing audio:", error);
      }
    }
  }

  async togglePlay() {
    if (this.songs.length === 0) return;

    if (this.isPlaying) {
      this.pause();
    } else {
      await this.play();
    }
  }

  async play() {
    try {
      if (!this.audioPlayer.src) {
        this.audioPlayer.src = this.songs[this.currentSongIndex].src;
      }

      await this.audioPlayer.play();
      this.isPlaying = true;
      this.playBtn.innerHTML = '<i class="fas fa-pause"></i>';

      if (!this.audioContext) {
        this.setupAudioAnalysis();
      }
      this.animateVisualizer();
    } catch (error) {
      console.error("Error playing audio:", error);
      alert(
        "Cannot play this audio file. Please check if the file exists and is in a supported format."
      );
    }
  }

  pause() {
    this.audioPlayer.pause();
    this.isPlaying = false;
    this.playBtn.innerHTML = '<i class="fas fa-play"></i>';
    this.stopVisualizer();
  }

  async selectSong(index) {
    if (index < 0 || index >= this.songs.length) return;

    const wasPlaying = this.isPlaying;

    if (this.isPlaying) {
      this.pause();
    }

    this.currentSongIndex = index;
    this.lastSongStartTime = Date.now();

    const song = this.songs[this.currentSongIndex];
    this.audioPlayer.src = song.src;
    this.updateSongDisplay();

    if (this.audioContext && this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
    this.setupAudioAnalysis();

    if (wasPlaying) {
      try {
        await this.audioPlayer.play();
        this.isPlaying = true;
        this.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        this.animateVisualizer();
      } catch (error) {
        console.error("Error playing audio:", error);
      }
    }
    this.lastSongStartTime = Date.now();
    this.lastSeekTime = 0;
  }

  prevSong() {
    if (this.songs.length === 0) return;

    const currentTime = this.audioPlayer.currentTime;
    const now = Date.now();
    const timeSinceSongStart = (now - this.lastSongStartTime) / 1000;
    const timeSinceLastSeek = this.lastSeekTime
      ? (now - this.lastSeekTime) / 1000
      : Infinity;

    if (timeSinceLastSeek < 2) {
      this.audioPlayer.currentTime = 0;
      this.updateProgress();
      if (this.isPlaying) {
        this.audioPlayer.play();
      }
      return;
    }

    if (currentTime > this.prevSongThreshold) {
      this.audioPlayer.currentTime = 0;
      this.updateProgress();
      this.lastSeekTime = Date.now();
      if (this.isPlaying) {
        this.audioPlayer.play();
      }
    } else {
      let prevIndex;

      if (this.isShuffled) {
        this.currentShuffleIndex =
          this.currentShuffleIndex > 0
            ? this.currentShuffleIndex - 1
            : this.shuffledIndices.length - 1;
        prevIndex = this.shuffledIndices[this.currentShuffleIndex];
      } else {
        prevIndex =
          this.currentSongIndex > 0
            ? this.currentSongIndex - 1
            : this.songs.length - 1;
      }

      this.selectSong(prevIndex);
    }
  }

  nextSong() {
    if (this.songs.length === 0) return;

    if (this.repeatMode === 1 && !this.isNextButtonPressed) {
      this.audioPlayer.currentTime = 0;
      if (this.isPlaying) {
        this.audioPlayer.play();
      }
      return;
    }

    this.isNextButtonPressed = false;

    let nextIndex;

    if (this.isShuffled) {
      this.currentShuffleIndex =
        this.currentShuffleIndex < this.shuffledIndices.length - 1
          ? this.currentShuffleIndex + 1
          : 0;
      nextIndex = this.shuffledIndices[this.currentShuffleIndex];
    } else {
      nextIndex =
        this.currentSongIndex < this.songs.length - 1
          ? this.currentSongIndex + 1
          : 0;
    }

    this.selectSong(nextIndex);
  }

  updateProgress() {
    if (this.audioPlayer.duration) {
      const progressPercent =
        (this.audioPlayer.currentTime / this.audioPlayer.duration) * 100;
      this.progress.style.width = `${progressPercent}%`;
      this.currentTimeEl.textContent = this.formatTime(
        this.audioPlayer.currentTime
      );
    }
  }

  handleProgressBarTouch(e) {
    if (this.audioPlayer.duration) {
      const rect = this.progressBar.getBoundingClientRect();
      const clickX = e.touches[0].clientX - rect.left;
      const width = rect.width;
      const newTime = (clickX / width) * this.audioPlayer.duration;
      this.audioPlayer.currentTime = newTime;
      e.preventDefault();
    }
  }

  togglePlaylist() {
    this.playlistVisible = !this.playlistVisible;
    this.playlist.classList.toggle("visible", this.playlistVisible);
    this.body.classList.toggle("playlist-open", this.playlistVisible);

    if (window.innerWidth <= 768) {
      if (this.playlistVisible) {
        const activeItem = this.playlistContainer.querySelector(
          ".playlist-item.active"
        );
        if (activeItem) {
          activeItem.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }
    }
  }

  showPlaylist() {
    this.playlistVisible = true;
    this.playlist.classList.add("visible");
    this.body.classList.add("playlist-open");
    this.burgerMenu.classList.add("hidden");
  }

  hidePlaylist() {
    if (!this.playlistHovered && !this.triggerHovered) {
      this.playlistVisible = false;
      this.playlist.classList.remove("visible");
      this.body.classList.remove("playlist-open");
      this.burgerMenu.classList.remove("hidden");
    }
  }

  setupEventListeners() {
    this.playBtn.addEventListener("click", () => this.togglePlay());
    this.prevBtn.addEventListener("click", () => this.prevSong());

    this.nextBtn.addEventListener("click", () => {
      this.isNextButtonPressed = true;
      this.nextSong();
    });

    this.shuffleBtn.addEventListener("click", () => this.toggleShuffle());
    this.repeatBtn.addEventListener("click", () => this.toggleRepeat());

    this.progressBar.addEventListener("click", (e) => {
      if (this.audioPlayer.duration) {
        const clickX = e.offsetX;
        const width = this.progressBar.offsetWidth;
        const newTime = (clickX / width) * this.audioPlayer.duration;
        this.audioPlayer.currentTime = newTime;
      }
    });

    this.progressBar.addEventListener("touchstart", (e) => {
      this.handleProgressBarTouch(e);
    });

    this.progressBar.addEventListener("touchmove", (e) => {
      this.handleProgressBarTouch(e);
    });

    let touchStartX = 0;
    const playerContainer = document.querySelector(".music-player");

    playerContainer.addEventListener("touchstart", (e) => {
      touchStartX = e.touches[0].clientX;
    });

    playerContainer.addEventListener("touchend", (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const diffX = touchStartX - touchEndX;

      if (Math.abs(diffX) > 50) {
        if (diffX > 0) {
          this.nextSong();
        } else {
          this.prevSong();
        }
      }
    });

    this.burgerMenu.addEventListener("click", () => this.togglePlaylist());

    this.playlistTrigger.addEventListener("mouseenter", () => {
      this.triggerHovered = true;
      this.showPlaylist();
    });

    this.playlistTrigger.addEventListener("mouseleave", () => {
      this.triggerHovered = false;
      setTimeout(() => this.hidePlaylist(), 100);
    });

    this.playlist.addEventListener("mouseenter", () => {
      this.playlistHovered = true;
    });

    this.playlist.addEventListener("mouseleave", () => {
      this.playlistHovered = false;
      setTimeout(() => this.hidePlaylist(), 100);
    });

    document.addEventListener("keydown", (e) => {
      switch (e.code) {
        case "Space":
          e.preventDefault();
          this.togglePlay();
          break;
        case "ArrowLeft":
          this.prevSong();
          break;
        case "ArrowRight":
          this.nextSong();
          break;
        case "KeyS":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.toggleShuffle();
          }
          break;
        case "KeyR":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.toggleRepeat();
          }
          break;
      }
    });
  }

  setupAudioEvents() {
    this.audioPlayer.addEventListener("timeupdate", () => {
      this.updateProgress();
    });

    this.audioPlayer.addEventListener("ended", () => {
      if (this.repeatMode === 1) {
        this.audioPlayer.currentTime = 0;
        this.audioPlayer.play();
      } else if (this.repeatMode === 2) {
        if (
          (this.isShuffled &&
            this.currentShuffleIndex === this.shuffledIndices.length - 1) ||
          (!this.isShuffled && this.currentSongIndex === this.songs.length - 1)
        ) {
          this.pause();
        } else {
          this.nextSong();
        }
      } else {
        this.nextSong();
      }
    });

    this.audioPlayer.addEventListener("loadedmetadata", () => {
      this.durationEl.textContent = this.formatTime(this.audioPlayer.duration);
    });

    this.audioPlayer.addEventListener("error", (e) => {
      console.error("Audio error:", e);
      this.pause();
    });
  }

  destroy() {
    if (this.backgroundChangeInterval) {
      clearInterval(this.backgroundChangeInterval);
    }
    this.stopVisualizer();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const player = new MusicPlayer();

  window.addEventListener("beforeunload", () => {
    player.destroy();
  });
});
