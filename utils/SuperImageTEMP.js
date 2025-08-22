import { Animated } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Player } from '@react-native-community/audio-toolkit';
import { Vibration } from 'react-native';
import ironicConfig from '../utils/ironicConfig.json';

export default class SuperImage {
  constructor(complexImage, name = "") {
    console.log("initializing SuperImage with audio integration");

    this.masterSrc = complexImage.src;
    this.title = complexImage.title;
    this.id = complexImage.id;

    this.layers = { 0: { src: complexImage.src } };
    this.currentImageKey = 0;

    // SEGMENTATION & AUDIO PROPERTIES
    this.segmentData = null;
    this.segmentRecords = new Map(); // Map of segmentKey -> {color, sound, haptic, count}

    this.pan = new Animated.ValueXY();
    this.canTriggerVibration = true;
    this.initialVolume = ironicConfig.initialVolume || 1.0;
    this.players = {};
    this.isPlaying = false;
    this.switchInterval = 5000;

    this.activeSegment = null;
    this.activePlayer = null;
    this.pendingStop = false;
    this.lastSegment = null;

    this.win = {
      winWidth: 300,
      winHeight: 300,
      imgWidth: 10,
      imgHeight: 10,
    };
  }

  initAudioPlayers() {
    const imageConfig = ironicConfig.colors[this.title];
    if (!imageConfig) return;

    for (let segmentKey in imageConfig) {
      if (imageConfig.hasOwnProperty(segmentKey)) {
        const { sound: soundUrl, volume } = imageConfig[segmentKey];
        if (soundUrl) {
          this.players[segmentKey] = new Player(soundUrl, { 
            autoDestroy: false,
            continuesToPlayInBackground: false
          });
          this.players[segmentKey].prepare((err) => {
            if (!err) this.players[segmentKey].volume = volume || this.initialVolume;
          });
        }
      }
    }
  }

  currentImage() {
    return this.layers[this.currentImageKey];
  }

  getPos(x, y) {
    return {
      x: Math.min(Math.max(Math.floor((x / this.win.winWidth) * this.win.imgWidth), 0), this.win.imgWidth - 1),
      y: Math.min(Math.max(Math.floor((y / this.win.winHeight) * this.win.imgHeight), 0), this.win.imgHeight - 1),
    };
  }

  getColorAt(x, y) {
    if (!this.segmentData) return "#ffffff";
    const pos = this.getPos(x, y);
    const idx = pos.y * this.win.imgWidth + pos.x;
    if (idx < 0 || idx >= this.segmentData.length) return "#ffffff";

    const segment = this.segmentData[idx];
    const segmentKey = segment.toString();
    
    // FIXED: Get the color from segmentRecords instead of config
    const segmentInfo = this.segmentRecords.get(segmentKey);
    return segmentInfo?.color || "#ffffff";
  }

  // Get complete segment information for display
  getSegmentInfo(segmentKey) {
    if (segmentKey === null || segmentKey === undefined) return null;
    return this.segmentRecords.get(segmentKey.toString()) || null;
  }

  async performSegmentation(imageData) {
    this.win = {
      winWidth: 300,
      winHeight: 300,
      imgWidth: imageData.width || 10,
      imgHeight: imageData.height || 10,
    };

    const { imgWidth, imgHeight } = this.win;
    const size = imgWidth * imgHeight;
    this.segmentData = new Array(size);

    // Define colors for each segment
    const segmentColors = {
      '-1': '#888888', // Gray for edges/outside
      '0': '#FF6B6B',  // Red for top-left
      '1': '#4ECDC4',  // Teal for top-right
      '2': '#FFE66D',  // Yellow for bottom-left
      '3': '#6B5B95'   // Purple for bottom-right
    };

    // Initialize segment records with actual data
    this.segmentRecords.clear();
    
    const imageConfig = ironicConfig.colors[this.title];
    if (imageConfig) {
      for (let segmentKey in imageConfig) {
        if (imageConfig.hasOwnProperty(segmentKey)) {
          const segmentConfig = imageConfig[segmentKey];
          this.segmentRecords.set(segmentKey, {
            color: segmentColors[segmentKey] || "#ffffff",
            sound: segmentConfig.sound ? 'Loaded' : 'None',
            haptic: segmentConfig.haptic ? `${segmentConfig.haptic.type}: ${JSON.stringify(segmentConfig.haptic.spec)}` : 'None',
            switchPlayer: segmentConfig.switchPlayer || false,
            count: 0
          });
        }
      }
    }

    for (let y = 0; y < imgHeight; y++) {
      for (let x = 0; x < imgWidth; x++) {
        let segment;
        if (x === 0 || y === 0 || x === imgWidth - 1 || y === imgHeight - 1) segment = -1;
        else if (x < imgWidth / 2 && y < imgHeight / 2) segment = 0;
        else if (x >= imgWidth / 2 && y < imgHeight / 2) segment = 1;
        else if (x < imgWidth / 2 && y >= imgHeight / 2) segment = 2;
        else segment = 3;

        this.segmentData[y * imgWidth + x] = segment;
      }
    }

    console.log(`Segmentation with ${size} pixels created`);
    this.initAudioPlayers();

    try {
      const completionSound = new Player(
        'https://commondatastorage.googleapis.com/codeskulptor-assets/week7-brrring.m4a',
        { autoDestroy: true }
      );
      completionSound.prepare((err) => { if (!err) completionSound.play(); });
    } catch (error) {
      console.error('Error with completion sound:', error);
    }
  }

  play(x, y) {
    if (!this.segmentData) return;
    
    const pos = this.getPos(x, y);
    const idx = pos.y * this.win.imgWidth + pos.x;
    if (idx < 0 || idx >= this.segmentData.length) return;

    const segmentValue = this.segmentData[idx];
    const segmentKey = segmentValue.toString();
    
    // Update segment touch count
    const segmentInfo = this.segmentRecords.get(segmentKey);
    if (segmentInfo) {
      segmentInfo.count = (segmentInfo.count || 0) + 1;
      this.segmentRecords.set(segmentKey, segmentInfo);
    }
    
    // Only play if we've moved to a different segment
    if (segmentKey === this.lastSegment) {
      return;
    }
    
    this.lastSegment = segmentKey;
    
    if (!this.players[segmentKey]) return;

    if (this.activeSegment === segmentKey) {
      this.restartCurrentSound();
      return;
    }

    this.stopSound(() => {
      this.activePlayer = this.players[segmentKey];
      this.activeSegment = segmentKey;
      
      const segmentConfig = ironicConfig.colors[this.title]?.[segmentKey];
      if (!segmentConfig) return;

      this.activePlayer.play((err) => {
        if (!err) {
          this.isPlaying = true;
          if (segmentConfig.switchPlayer) this.scheduleSwitch();
        }
      });

      const hapticConfig = segmentConfig.haptic;
      if (hapticConfig) this.triggerHaptic(hapticConfig);
    });
  }

  restartCurrentSound() {
    if (this.activePlayer) {
      this.activePlayer.stop(() => {
        this.activePlayer.play((err) => { if (!err) this.isPlaying = true; });
      });
    }
  }

  switchPlayer() {
    if (this.isPlaying && this.activePlayer?.isPlaying) {
      this.activePlayer.stop();
      this.activePlayer.play();
    }
  }

  scheduleSwitch() {
    clearTimeout(this.switchTimer);
    this.switchTimer = setTimeout(() => {
      this.switchPlayer();
      if (this.isPlaying) this.scheduleSwitch();
    }, this.switchInterval);
  }

  stopSound(callback) {
    this.isPlaying = false;
    this.lastSegment = null;
    if (this.activePlayer) this.activePlayer.stop(() => { if (callback) callback(); });
    else if (callback) callback();
    clearTimeout(this.switchTimer);
  }

  updateVolume(segmentKey, newVolume) {
    if (this.players[segmentKey]) this.players[segmentKey].volume = newVolume;
  }

  triggerHaptic(hapticConfig) {
    if (!hapticConfig) return;
    try {
      if (hapticConfig.type === "haptic") ReactNativeHapticFeedback.trigger(hapticConfig.spec, { enableVibrateFallback: true });
      else if (hapticConfig.type === "vibration") Vibration.vibrate(hapticConfig.spec);
    } catch (error) { console.error(error); }
  }

  destroy() {
    Object.values(this.players).forEach(player => { player?.stop(); player?.destroy(); });
    clearTimeout(this.switchTimer);
    this.activeSegment = null;
    this.activePlayer = null;
    this.isPlaying = false;
    this.lastSegment = null;
  }
}