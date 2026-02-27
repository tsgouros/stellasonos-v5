import { Animated } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Player } from '@react-native-community/audio-toolkit';
import { Vibration } from 'react-native';
import ironicConfig from './ironicConfig.json';
import RNFetchBlob from 'rn-fetch-blob';
import { AdaptiveThresholdTypes, OpenCV } from 'react-native-fast-opencv';
import {
  ObjectType,
  ThresholdTypes,
  ColorConversionCodes,
  DataTypes,
  ConnectedComponentsTypes,
  InterpolationFlags,
} from 'react-native-fast-opencv';

// Downloads the image and returns it as a base64 string, then deletes the temp file
export async function fetchImageAsBase64(src) {
  console.log("-- Loading base64 from:", src);
  const resp = await RNFetchBlob.config({ fileCache: true }).fetch("GET", src);
  const imagePath = resp.path();
  const base64 = await resp.readFile("base64");
  await RNFetchBlob.fs.unlink(imagePath);
  return base64;
}

// Resizes the image to 1/3 of its original size so segmentation runs faster.
// Returns the resized Mat and updates imgWidth/imgHeight on the win object.
export async function resizeImage(srcMat, win) {
  const resizeMat = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_16UC1);
  const dsize = OpenCV.createObject(ObjectType.Size, 0, 0);
  await OpenCV.invoke("resize", srcMat, resizeMat, dsize, 1/3, 1/3, InterpolationFlags.INTER_AREA);
  const resizeMatJS = OpenCV.toJSValue(resizeMat);
  win.imgHeight = resizeMatJS.rows;
  win.imgWidth = resizeMatJS.cols;
  return resizeMat;
}

// Converts to grayscale, then applies adaptive threshold.
// Adaptive threshold handles uneven lighting better than a fixed cutoff would.
export async function applyThreshold(resizeMat, neighbor = 61) {
  const grayMat = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_16UC1);
  await OpenCV.invoke("cvtColor", resizeMat, grayMat, ColorConversionCodes.COLOR_BGR2GRAY);

  const threshMat = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8UC1);
  await OpenCV.invoke(
    "adaptiveThreshold",
    grayMat, threshMat, 255,
    AdaptiveThresholdTypes.ADAPTIVE_THRESH_MEAN_C,
    ThresholdTypes.THRESH_BINARY,
    neighbor, 0
  );
  return threshMat;
}

// Runs connected components on the thresholded image.
// Returns the label array (one int per pixel) and the stats array (area, bbox, etc. per label).
export async function runConnectedComponents(threshMat) {
  const labels = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8UC1);
  const stats = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_32S);
  const centroids = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_64F);

  const numSegment = await OpenCV.invoke(
    "connectedComponentsWithStats",
    threshMat, labels, stats, centroids
  );

  const labelArray = new Int32Array(OpenCV.matToBuffer(labels, 'int32').buffer);
  const statsArray = new Int32Array(OpenCV.matToBuffer(stats, 'int32').buffer);

  return { labelArray, statsArray, numSegment };
}

// Sorts all segments by area (largest first) and returns the top N label IDs.
// Label 0 is always OpenCV's background, so we skip it.
export function getTopSegmentLabels(statsArray, numSegment, maxSegment = 10) {
  const areas = [];
  for (let label = 1; label < numSegment.value; label++) {
    const area = statsArray[label * 5 + ConnectedComponentsTypes.CC_STAT_AREA];
    areas.push({ label, area });
  }
  areas.sort((a, b) => b.area - a.area);
  return areas.slice(0, maxSegment).map(seg => seg.label);
}

// Walks every pixel and assigns it to one of three buckets:
//   - Stars (tiny 10–40px specks) → segmentData label 1, colored yellow
//   - Top 10 meaningful segments  → segmentData label 2–11, colored varying red
//   - Everything else (noise/bg)  → segmentData label 0, colored blue
export function classifyPixels(win, labelArray, statsArray, topLabels, segmentData, starData, fillRGBArray) {
  let countStar = 0;

  for (let y = 0; y < win.imgHeight; y++) {
    for (let x = 0; x < win.imgWidth; x++) {
      const idx = x + y * win.imgWidth;
      const label = labelArray[idx];
      const area = statsArray[label * 5 + ConnectedComponentsTypes.CC_STAT_AREA];

      if (area >= 10 && area <= 40) {
        starData[idx] = label;
        segmentData[idx] = 1;
        countStar++;
        fillRGBArray(idx, 255, 255, 0, 255); // yellow
        continue;
      }

      const maxRank = topLabels.indexOf(label);
      if (maxRank !== -1) {
        segmentData[idx] = maxRank + 2; // offset by 2 because 0=bg, 1=stars
        const redness = Math.floor(50 + maxRank * (205 / 9));
        fillRGBArray(idx, redness, 0, 0, 255); // varying red
        continue;
      }

      segmentData[idx] = 0;
      fillRGBArray(idx, 0, 0, 255, 255); // blue
    }
  }

  return countStar;
}


// ─── SuperImage ──────────────────────────────────────────────────────────────

export default class SuperImage {
  constructor(complexImage, name = "") {
    console.log("initializing SuperImage with audio integration");

    this.masterSrc = complexImage.src;
    this.title = complexImage.title;
    this.id = complexImage.id;

    // Grab the config for this specific image up front so we don't have to look it up every time
    this.imageConfig = ironicConfig.colors[this.title] || {};
    this.layers = { 0: { src: complexImage.src } };
    this.currentImageKey = 0;

    // segmentData stores which segment each pixel belongs to.
    // segmentRecords holds the full config per segment (sound, haptic, touch count, etc.)
    this.segmentData = [];
    this.starData = {};
    this.displaySeg = new Array();
    this.segmentRecords = new Map();

    this.pan = new Animated.ValueXY();
    this.canTriggerVibration = true;
    this.initialVolume = ironicConfig.initialVolume || 1.0;
    this.players = {};

    // We prepare all audio players async, so we track how many are still loading.
    // Once pendingPrepares hits 0, we know everything is ready.
    this.pendingPrepares = 0;
    this.onAllPlayersReady = null;

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

  // Call this from the React component if you need to do something once all audio is loaded.
  // If everything's already ready by the time you call this, it fires immediately.
  setCompletionCallback(callback) {
    this.onAllPlayersReady = callback;
    if (this.pendingPrepares === 0) {
      callback();
      this.onAllPlayersReady = null;
    }
  }

  initAudioPlayers() {
    const imageConfig = this.imageConfig;
    if (!imageConfig || Object.keys(imageConfig).length === 0) {
      console.warn(`No ironicConfig found for title: ${this.title}`);
      return;
    }

    // Segment -1 means the user is touching outside the image.
    // Give it a default sound if the config doesn't define one.
    if (!imageConfig['-1']) {
      this.imageConfig['-1'] = {
        sound: "https://sgouros.com/stellasonos/samples/piano/E3.mp3",
        volume: this.initialVolume,
        color: "#000000",
        haptic: { type: "haptic", spec: "light" },
      };
    }

    this.pendingPrepares = 0;

    for (let segmentKey in imageConfig) {
      if (!imageConfig.hasOwnProperty(segmentKey)) continue;

      const segmentConfig = imageConfig[segmentKey];
      const { sound: soundUrl, volume } = segmentConfig;

      // Store everything from the config plus a touch counter we'll increment later
      this.segmentRecords.set(segmentKey, { ...segmentConfig, count: 0 });

      if (!soundUrl) continue;

      try {
        const newPlayer = new Player(soundUrl, {
          autoDestroy: false,
          continuesToPlayInBackground: false,
        });

        // Android can sometimes return a bad player object, so double-check before using it
        if (!newPlayer || typeof newPlayer.prepare !== 'function') {
          console.error(`Player creation failed for segment ${segmentKey}: object is null or invalid.`);
          continue;
        }

        this.players[segmentKey] = newPlayer;
        this.pendingPrepares++;

        // prepare() is async — the player isn't usable until this callback fires
        newPlayer.prepare((err) => {
          if (!err) {
            newPlayer.volume = volume || this.initialVolume;
            console.log(`Player for segment ${segmentKey} prepared successfully`);
          } else {
            console.error(`Error preparing player for segment ${segmentKey}:`, err);
          }

          // Tick down the counter; fire the ready callback once the last player is done
          this.pendingPrepares--;
          if (this.pendingPrepares === 0 && this.onAllPlayersReady) {
            this.onAllPlayersReady();
            this.onAllPlayersReady = null;
          }
        });
      } catch (error) {
        console.error(`Fatal error during player setup for segment ${segmentKey}:`, error);
      }
    }

    // Edge case: config exists but none of the segments had a sound URL
    if (this.pendingPrepares === 0 && this.onAllPlayersReady) {
      this.onAllPlayersReady();
      this.onAllPlayersReady = null;
    }
  }

  currentImage() {
    return this.layers[this.currentImageKey];
  }

  // Converts a touch position (in screen pixels) to image pixel coordinates.
  // Clamps to the image bounds so we never go out of range.
  getPos(x, y) {
    return {
      x: Math.min(Math.max(Math.floor((x / this.win.winWidth) * this.win.imgWidth), 0), this.win.imgWidth - 1),
      y: Math.min(Math.max(Math.floor((y / this.win.winHeight) * this.win.imgHeight), 0), this.win.imgHeight - 1),
    };
  }

  getColorAt(x, y) {
    if (!this.segmentData || this.segmentData.length === 0) return "#ffffff";

    const pos = this.getPos(x, y);
    const idx = pos.my * this.win.imgWidth + pos.mx;

    if (idx < 0 || idx >= this.segmentData.length ||
      this.segmentData[idx] === undefined || this.segmentData[idx] === null) {
      return "#ffffff";
    }

    const segment = this.segmentData[idx];
    const segmentInfo = this.segmentRecords.get(segment.toString());
    return segmentInfo?.color || "#ffffff";
  }

  getSegmentInfo(segmentKey) {
    if (segmentKey === null || segmentKey === undefined) return null;
    return this.segmentRecords.get(segmentKey.toString()) || null;
  }

  async loadBase64() {
    return fetchImageAsBase64(this.currentImage().src);
  }

  getMatImage() {
    return this.matJS?.base64 ? `data:image/png;base64,${this.matJS.base64}` : null;
  }

  // Called from ImagePage to get a visual of the segmentation for debugging.
  // Takes the raw segment array, draws each pixel as a colored block, and returns a base64 PNG.
  async inspectSegments() {
    console.log("6) display and inspect segmentation...");
    try {
      const mat = OpenCV.createObject(
        ObjectType.Mat,
        this.win.imgHeight, this.win.imgWidth,
        DataTypes.CV_8UC4,
        this.displaySeg
      );
      const jsValue = OpenCV.toJSValue(mat, 'png');
      const uri = `data:image/png;base64,${jsValue.base64}`;
      console.log("uri", uri);
      return uri;
    } catch (e) {
      console.log(e);
    }
  }

  to1DCoordinate(x, y) {
    return x + y * this.win.imgWidth;
  }

  // OpenCV's Mat uses BGRA order (not RGBA), so we have to swap R and B here
  fillRGBArray(i, r, g, b, a) {
    this.displaySeg[i * 4 + 0] = b;
    this.displaySeg[i * 4 + 1] = g;
    this.displaySeg[i * 4 + 2] = r;
    this.displaySeg[i * 4 + 3] = a;
  }

  async performSegmentation() {
    console.log(">>>> in function: performSegmentation");

    // 1) Load
    const src = await this.loadBase64();
    if (!src) throw new Error("src base64 string not ready yet");
    console.log("----1) base64ToMat");
    const srcMat = OpenCV.base64ToMat(src);

    // 2) Resize to 1/3
    console.log("----2) resize: factor 1/3");
    const resizeMat = await resizeImage(srcMat, this.win);
    console.log("resizeMat", this.win);

    // Now that we know the actual image dimensions, allocate the display buffer
    this.displaySeg = new Array(this.win.imgHeight * this.win.imgWidth * 4).fill(0);

    // 3) Grayscale + threshold
    console.log("----3) grayscaling + thresholding...");
    const threshMat = await applyThreshold(resizeMat);
    this.matJS = OpenCV.toJSValue(threshMat);

    // 4) Connected components
    console.log("----4) ConnectedComponents...");
    try {
      const { labelArray, statsArray, numSegment } = await runConnectedComponents(threshMat);
      console.log("numSegment", numSegment);

      const topLabels = getTopSegmentLabels(statsArray, numSegment, 10);
      console.log("top segment labels:", topLabels);

      // 5) Classify every pixel
      const countStar = classifyPixels(
        this.win,
        labelArray,
        statsArray,
        topLabels,
        this.segmentData,
        this.starData,
        this.fillRGBArray.bind(this)
      );
      console.log("FINAL: Counted stars #", countStar);
    } catch (error) {
      console.error('Error in performSegmentation:', error);
    }

    OpenCV.clearBuffers();
    console.log(">>>> Segmentation completed successfully");

    // Log which audio URLs we're about to load
    for (let segmentKey in this.imageConfig) {
      if (this.imageConfig.hasOwnProperty(segmentKey)) {
        console.log(`Segment ${segmentKey}: ${this.imageConfig[segmentKey].sound}`);
      }
    }

    this.initAudioPlayers();
  }

  play(x, y) {
    if (!this.segmentData || this.segmentData.length === 0) {
      console.log("No segment data available");
      return;
    }

    // (-1, -1) is a special signal meaning the user moved outside the image entirely
    if (x === -1 && y === -1) {
      this.playSegmentSound("-1");
      return;
    }

    const pos = this.getPos(x, y);
    const idx = pos.y * this.win.imgWidth + pos.x;

    if (idx < 0 || idx >= this.segmentData.length ||
      this.segmentData[idx] === undefined || this.segmentData[idx] === null) {
      console.log(`No segment data at index ${idx}`);
      return;
    }

    this.playSegmentSound(this.segmentData[idx].toString());
  }

  playSegmentSound(segmentKey) {
    const segmentInfo = this.segmentRecords.get(segmentKey);

    // Keep a running count of how many times each segment has been touched (shown in the info box)
    if (segmentInfo) {
      segmentInfo.count = (segmentInfo.count || 0) + 1;
      this.segmentRecords.set(segmentKey, segmentInfo);
    }

    // Don't retrigger if the finger is still on the same segment as last time
    if (segmentKey === this.lastSegment) return;
    this.lastSegment = segmentKey;

    if (!this.players[segmentKey]) {
      console.log(`No audio player found for segment ${segmentKey}. Checking for haptic...`);
      // No sound, but we still fall through to trigger haptic feedback below
    }

    // If the user comes back to the same segment that's already playing, restart it from the top
    if (this.activeSegment === segmentKey) {
      this.restartCurrentSound();
      return;
    }

    this.stopSound(() => {
      this.activePlayer = this.players[segmentKey];
      this.activeSegment = segmentKey;

      const segmentConfig = this.imageConfig[segmentKey];
      if (!segmentConfig) {
        console.log(`No config found for segment ${segmentKey}`);
        return;
      }

      // Trigger haptic first — it should fire even if the audio fails
      if (segmentConfig.haptic) this.triggerHaptic(segmentConfig.haptic);

      if (this.activePlayer) {
        // Only play if the player has finished preparing — otherwise the audio toolkit will throw
        if (this.activePlayer.isPrepared) {
          this.activePlayer.play((err) => {
            if (err) {
              console.error(`Error playing sound for segment ${segmentKey}:`, err);
              return;
            }
            this.isPlaying = true;
            if (segmentConfig.switchPlayer) this.scheduleSwitch();
          });
        } else {
          // Player is still loading (slow network?). Nothing we can do but skip this touch.
          console.warn(`Player for segment ${segmentKey} is not prepared yet. Skipping play.`);
        }
      }
    });
  }

  restartCurrentSound() {
    if (this.activePlayer && typeof this.activePlayer.stop === 'function') {
      this.activePlayer.stop(() => {
        if (this.activePlayer && typeof this.activePlayer.play === 'function') {
          this.activePlayer.play((err) => {
            if (err) {
              console.error('Error restarting sound:', err);
            } else {
              this.isPlaying = true;
            }
          });
        }
      });
    }
  }

  switchPlayer() {
    if (this.isPlaying && this.activePlayer?.isPlaying && typeof this.activePlayer.stop === 'function') {
      this.activePlayer.stop();
      if (typeof this.activePlayer.play === 'function') {
        this.activePlayer.play();
      }
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
    clearTimeout(this.switchTimer);

    if (this.activePlayer && typeof this.activePlayer.stop === 'function') {
      if (this.activePlayer.isPlaying) {
        this.activePlayer.stop(() => {
          this.activePlayer = null;
          this.activeSegment = null;
          if (callback) callback();
        });
      } else {
        // Player exists but isn't currently playing — just clear it and move on
        this.activePlayer = null;
        this.activeSegment = null;
        if (callback) callback();
      }
    } else {
      // No active player at all — nothing to stop, just run the callback
      this.activePlayer = null;
      this.activeSegment = null;
      if (callback) callback();
    }
  }

  updateVolume(segmentKey, newVolume) {
    if (this.players[segmentKey]) this.players[segmentKey].volume = newVolume;
  }

  triggerHaptic(hapticConfig) {
    if (!hapticConfig) return;
    try {
      if (hapticConfig.type === "haptic") {
        ReactNativeHapticFeedback.trigger(hapticConfig.spec, { enableVibrateFallback: true });
      } else if (hapticConfig.type === "vibration") {
        Vibration.vibrate(hapticConfig.spec);
      }
    } catch (error) {
      console.error('Haptic error:', error);
    }
  }

  destroy() {
    Object.values(this.players).forEach(player => {
      if (player && typeof player.destroy === 'function') {
        player?.stop();
        player?.destroy();
      }
    });
    clearTimeout(this.switchTimer);
    this.activeSegment = null;
    this.activePlayer = null;
    this.isPlaying = false;
    this.lastSegment = null;
    this.onAllPlayersReady = null;
  }
}