import { Animated } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Player } from '@react-native-community/audio-toolkit';
import { Vibration } from 'react-native';
import ironicConfig from '../utils/ironicConfig.json';

import RNFetchBlob from 'rn-fetch-blob';
import { AdaptiveThresholdTypes, OpenCV } from 'react-native-fast-opencv';
import { ObjectType, ThresholdTypes, ColorConversionCodes, DataTypes, ConnectedComponentsTypes, RetrievalModes, ContourApproximationModes, InterpolationFlags } from 'react-native-fast-opencv';

export default class SuperImage {
  constructor(complexImage, name = "") {
    console.log("initializing SuperImage with audio integration");

    this.masterSrc = complexImage.src;
    this.title = complexImage.title;
    this.id = complexImage.id;

    this.layers = { 0: { src: complexImage.src } };
    this.currentImageKey = 0;

    // SEGMENTATION & AUDIO PROPERTIES
    this.segmentData = []; // CHANGED: Array instead of object
    this.starData = {};
    this.segmentRecords = new Map();

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
          try {
            this.players[segmentKey] = new Player(soundUrl, {
              autoDestroy: false,
              continuesToPlayInBackground: false
            });

            this.players[segmentKey].prepare((err) => {
              if (!err) {
                this.players[segmentKey].volume = volume || this.initialVolume;
                console.log(`Player for segment ${segmentKey} prepared successfully`);
              } else {
                console.error(`Error preparing player for segment ${segmentKey}:`, err);
                // Try to re-prepare after a delay
                setTimeout(() => {
                  if (this.players[segmentKey]) {
                    this.players[segmentKey].prepare();
                  }
                }, 1000);
              }
            });
          } catch (error) {
            console.error(`Error creating player for segment ${segmentKey}:`, error);
          }
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
    // FIXED: Proper check for empty array
    if (!this.segmentData || this.segmentData.length === 0) return "#ffffff";

    const pos = this.getPos(x, y);
    const idx = pos.y * this.win.imgWidth + pos.x;

    // FIXED: Check if index exists and has valid value
    if (idx < 0 || idx >= this.segmentData.length ||
      this.segmentData[idx] === undefined || this.segmentData[idx] === null) {
      return "#ffffff";
    }

    const segment = this.segmentData[idx];
    const segmentKey = segment.toString();

    const segmentInfo = this.segmentRecords.get(segmentKey);
    return segmentInfo?.color || "#ffffff";
  }

  getSegmentInfo(segmentKey) {
    if (segmentKey === null || segmentKey === undefined) return null;
    return this.segmentRecords.get(segmentKey.toString()) || null;
  }

  async loadBase64() {
    console.log(">> Loading base64 from:", this.currentImage().src);
    let imagePath;
    const resp = await RNFetchBlob.config({ fileCache: true })
      .fetch("GET", this.currentImage().src);
    imagePath = resp.path();
    const base64 = await resp.readFile("base64");
    await RNFetchBlob.fs.unlink(imagePath);
    return base64;
  }

  getMatImage() {
    return this.matJS?.base64 ? `data:image/png;base64,${this.matJS.base64}` : null;
  }

  convertTo1DCoordinate(x, y) {
    return x + y * this.win.imgWidth;
  }

  async performSegmentation() {
        // this.win = {
    //   winWidth: 300,
    //   winHeight: 300,
    //   imgWidth: imageData.width || 10,
    //   imgHeight: imageData.height || 10,
    // };

    // const { imgWidth, imgHeight } = this.win;
    // const size = imgWidth * imgHeight;

    // TODO: check just use superimage object
    console.log(">>>> in function: performSegmentation");

    const src = await this.loadBase64()
    if (!src) throw new Error("src base64 string not ready yet");
 
    console.log("----1) base64ToMat");
    const srcMat = OpenCV.base64ToMat(src);
    console.log("source", srcMat);
    // const srcMatJS = OpenCV.toJSValue(srcMat);


    console.log("----2) resize: factor 1/3")
    let resizeMat = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_16UC1);
    let dsize = OpenCV.createObject(ObjectType.Size, 0, 0)
    await OpenCV.invoke("resize",srcMat,resizeMat,dsize,1/3,1/3,InterpolationFlags.INTER_AREA)
    let resizeMatJS = OpenCV.toJSValue(resizeMat)
    this.win.imgHeight = resizeMatJS.cols
    this.win.imgWidth = resizeMatJS.rows
    console.log("resizeMat", this.win)


    console.log('----3) grayscaling...');
    // must specify size from srcMatJS, otherwise hostfunction <unknown>
    let grayMat = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_16UC1);
    await OpenCV.invoke("cvtColor", resizeMat, grayMat, ColorConversionCodes.COLOR_BGR2GRAY);
    // this.matJS = OpenCV.toJSValue(grayMat)
    // console.log("grayMat", OpenCV.toJSValue(grayMat));


    console.log('----4) thresholding...');
    // adaptiveThreshold dynamically assign a threshold when looking at area of size=neighbor*neighbor, must be odd to have a center
    var neighbor = 61
    let threshMat = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8UC1);
    await OpenCV.invoke("adaptiveThreshold", grayMat, threshMat, 255, AdaptiveThresholdTypes.ADAPTIVE_THRESH_MEAN_C, ThresholdTypes.THRESH_BINARY, neighbor, 0);
    // await OpenCV.invoke("threshold", grayMat, threshMat, thresh, 255, ThresholdTypes.THRESH_BINARY);
    // TODO: approximate a global OTSU threshold by intensity histogram, more computation: https://chatgpt.com/s/t_68b0d721107c81919aa9b841ae88d612
    this.matJS = OpenCV.toJSValue(threshMat)
    // console.log("threshMat", OpenCV.toJSValue(threshMat));

    console.log('----6) ConnectedComponent...');
    try {
      let labels = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8UC1);
      let stats = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_32S);
      let centroids = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_64F);
      let numSegment = await OpenCV.invoke("connectedComponentsWithStats", threshMat, labels, stats, centroids)
      // this.matJS = OpenCV.toJSValue(edgeMat)
      console.log("numSegment", numSegment)
      const labelsData = OpenCV.matToBuffer(labels, 'int32');
      const labelArray = new Int32Array(labelsData.buffer);
      console.log('labelsData =', labelsData);

      const statsData = OpenCV.matToBuffer(stats, 'int32');
      const statsArray = new Int32Array(statsData.buffer);
      console.log('statsData = ', statsData)

      let areas = [];
      // start from 1: label 0 is background
      for (let label = 0; label < numSegment.value; label++) {
        const area = statsArray[label * 5 + ConnectedComponentsTypes.CC_STAT_AREA];
        areas.push({ label, area });
      }
      // sort descending by area
      areas.sort((a, b) => b.area - a.area);
      console.log("segment areas sorted: ", areas)

      // TODO: DISABLED, dynamically assign maxSegment, but jump definition seems off
      // var maxSegment = 0
      // var segmentCutoff = 1/2
      // for (let i = 0; i < areas.length - 1; i++) {
      //   if (areas[i].area / areas[i+1].area > segmentCutoff) { // large jump
      //     maxSegment = i + 1;
      //     break;
      //   }
      // }
      // TODO: maxSegment = max of loop result of no.segment

      // 0 is background, 1 is the largest "meaningful" segment
      var maxSegment = 10
      let largeSegments = areas.slice(0, maxSegment);
      console.log("segment areas largest cut: ", maxSegment, largeSegments);
      // for easy concat to this.segmentData
      const topLabels = largeSegments.map(seg => seg.label);
      // console.log(topLabels);

      let countStar = 0
      let starLabel = maxSegment + 1
      // console.log(this.win.imgHeight, this.win.imgWidth)
      for (let y = 0; y < this.win.imgHeight; y++) {
        for (let x = 0; x < this.win.imgWidth; x++) {
          const idx = this.convertTo1DCoordinate(x, y);
          const label = labelArray[idx];
          const area = statsArray[label * 5 + ConnectedComponentsTypes.CC_STAT_AREA];
          // Debug: check pixel index, its segment ID, and the segment's area
          // console.log("Pixel index:", idx, "Segment ID:", label, "Area:", area);

          // easier to treat background label=0 separately later, during audio
          if (topLabels.includes(label)) {
            this.segmentData[idx] = label;
            continue;
          }
          // all of the small segments will be stars and play a clinging sound, assign to a uniform label=maxSegment+1
          if (area <= 10) { 
            this.starData[idx] = label;
            this.segmentData[idx] = starLabel;
            countStar++
            continue;
          }
          // push the rest to a uniform label=background, too small to look at individually
          this.segmentData[idx] = 0;
        }
      }
      console.log("FINAL: Counted stars # ", countStar, this.starData, this.segmentData)
    } catch (error) {
      console.error('Error in performSegmentation:', error);
    }  

    OpenCV.clearBuffers();
    console.log(
      `>>>> SuperImage.performSegmentation(): segmentation finished.`
    );
    
    console.log(">>>> Segmentation completed successfully");
    
    console.log("Audio URLs being used:");
    for (let segmentKey in imageConfig) {
      if (imageConfig.hasOwnProperty(segmentKey)) {
        const segmentConfig = imageConfig[segmentKey];
        console.log(`Segment ${segmentKey}: ${segmentConfig.sound}`);
      }
    }
  }

  play(x, y) {
    // FIXED: Check for empty array
    if (!this.segmentData || this.segmentData.length === 0) {
      console.log("No segment data available");
      return;
    }

    // Handle outside segment (-1)
    if (x === -1 && y === -1) {
      const segmentKey = "-1";
      this.playSegmentSound(segmentKey);
      return;
    }

    const pos = this.getPos(x, y);
    const idx = pos.y * this.win.imgWidth + pos.x;

    // FIXED: Check if segment exists at this index
    if (idx < 0 || idx >= this.segmentData.length ||
      this.segmentData[idx] === undefined || this.segmentData[idx] === null) {
      console.log(`No segment data at index ${idx}`);
      return;
    }

    const segmentValue = this.segmentData[idx];
    const segmentKey = segmentValue.toString();

    this.playSegmentSound(segmentKey);
  }

  // NEW METHOD: Handle segment sound playback
  playSegmentSound(segmentKey) {
    const segmentInfo = this.segmentRecords.get(segmentKey);
    if (segmentInfo) {
      segmentInfo.count = (segmentInfo.count || 0) + 1;
      this.segmentRecords.set(segmentKey, segmentInfo);
    }

    if (segmentKey === this.lastSegment) {
      return;
    }

    this.lastSegment = segmentKey;

    if (!this.players[segmentKey]) {
      console.log(`No audio player for segment ${segmentKey}`);
      return;
    }

    if (this.activeSegment === segmentKey) {
      this.restartCurrentSound();
      return;
    }

    this.stopSound(() => {
      this.activePlayer = this.players[segmentKey];
      this.activeSegment = segmentKey;

      const segmentConfig = ironicConfig.colors[this.title]?.[segmentKey];
      if (!segmentConfig) {
        console.log(`No config for segment ${segmentKey}`);
        return;
      }

      // Check if player is prepared before playing
      if (this.activePlayer.isPrepared) {
        this.activePlayer.play((err) => {
          if (err) {
            console.error(`Error playing sound for segment ${segmentKey}:`, err);
            // Try to prepare again if play fails
            this.activePlayer.prepare((prepErr) => {
              if (!prepErr) {
                this.activePlayer.play();
              }
            });
            return;
          }
          this.isPlaying = true;
          if (segmentConfig.switchPlayer) this.scheduleSwitch();
        });
      } else {
        // Prepare first if not ready
        this.activePlayer.prepare((prepErr) => {
          if (prepErr) {
            console.error(`Error preparing player for segment ${segmentKey}:`, prepErr);
            return;
          }
          this.activePlayer.play((playErr) => {
            if (playErr) {
              console.error(`Error playing sound for segment ${segmentKey}:`, playErr);
              return;
            }
            this.isPlaying = true;
            if (segmentConfig.switchPlayer) this.scheduleSwitch();
          });
        });
      }

      const hapticConfig = segmentConfig.haptic;
      if (hapticConfig) this.triggerHaptic(hapticConfig);
    });
  }

  restartCurrentSound() {
    if (this.activePlayer) {
      this.activePlayer.stop(() => {
        this.activePlayer.play((err) => {
          if (err) {
            console.error('Error restarting sound:', err);
          } else {
            this.isPlaying = true;
          }
        });
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
    if (this.activePlayer) {
      this.activePlayer.stop(() => {
        if (callback) callback();
      });
    } else if (callback) {
      callback();
    }
    clearTimeout(this.switchTimer);
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
      player?.stop();
      player?.destroy();
    });
    clearTimeout(this.switchTimer);
    this.activeSegment = null;
    this.activePlayer = null;
    this.isPlaying = false;
    this.lastSegment = null;
  }
}