// ─────────────────────────────────────────────────────────────────────────
// SuperImage.js
//
// This is the orchestrator: it owns the image state (which layer is showing,
// touch position math, the segment map) and wires together two contained
// modules:
//   - segmentation.js   → turns an image into a segment map (see runSegmentation)
//   - audioController.js → plays sound/haptics for whichever segment is touched
//
// Public API used by pages/ImagePage.js and pages/TestSeg.js is unchanged
// from before this file was split up — see docs/CODE_OVERVIEW.md for the
// full map of what calls what.
// ─────────────────────────────────────────────────────────────────────────

import { Animated } from 'react-native';
import ironicConfig from './ironicConfig.json';
import { OpenCV, ObjectType, DataTypes } from 'react-native-fast-opencv';

import { runSegmentation, fetchImageAsBase64 } from './segmentation.js';
import AudioController from './audioController.js';

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

    // segmentData stores which segment each pixel belongs to (filled in by performSegmentation).
    this.segmentData = [];
    this.starData = {};
    this.displaySeg = new Array();

    this.pan = new Animated.ValueXY();
    this.canTriggerVibration = true;
    this.initialVolume = ironicConfig.initialVolume || 1.0;

    this.win = {
      winWidth: 300,
      winHeight: 300,
      imgWidth: 10,
      imgHeight: 10,
    };

    // All sound/haptic playback is contained in AudioController — see audioController.js
    this.audio = new AudioController(this.imageConfig, this.initialVolume);
  }

  /**
   * setCompletionCallback
   * Call this from the React component if you need to do something once
   * all audio is loaded. If everything's already ready, it fires immediately.
   *
   * @param {function} callback
   */
  setCompletionCallback(callback) {
    this.audio.setCompletionCallback(callback);
  }

  currentImage() {
    return this.layers[this.currentImageKey];
  }

  /**
   * getPos
   * Converts a touch position (in screen pixels) to image pixel coordinates.
   * Clamps to the image bounds so we never go out of range.
   *
   * @param {number} x - touch x, in screen pixels
   * @param {number} y - touch y, in screen pixels
   * @returns {{x: number, y: number}} clamped image pixel coordinates
   */
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
    const segmentInfo = this.audio.getSegmentInfo(segment);
    return segmentInfo?.color || "#ffffff";
  }

  /**
   * getSegmentInfo
   * @param {string|number} segmentKey
   * @returns {object|null} the stored config (sound/color/haptic/touch count) for that segment
   */
  getSegmentInfo(segmentKey) {
    return this.audio.getSegmentInfo(segmentKey);
  }

  async loadBase64() {
    return fetchImageAsBase64(this.currentImage().src);
  }

  getMatImage() {
    return this.matJS?.base64 ? `data:image/png;base64,${this.matJS.base64}` : null;
  }

  /**
   * inspectSegments
   * Called from ImagePage to get a visual of the segmentation for debugging.
   * Takes the display buffer painted during performSegmentation and returns
   * it as a base64 PNG.
   *
   * @returns {Promise<string|undefined>} data URI of the segmentation preview PNG
   */
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

  /**
   * performSegmentation
   * Runs the full segmentation pipeline (see segmentation.js) against the
   * current image, then kicks off audio player setup once segmentData is ready.
   */
  async performSegmentation() {
    console.log(">>>> in function: performSegmentation");

    const { matJS } = await runSegmentation(
      this.currentImage().src,
      this.win,
      this.segmentData,
      this.starData,
      this.fillRGBArray.bind(this),
      // Now that we know the actual image dimensions, allocate the display buffer
      (win) => { this.displaySeg = new Array(win.imgHeight * win.imgWidth * 4).fill(0); }
    );
    this.matJS = matJS;

    // Log which audio URLs we're about to load
    for (let segmentKey in this.imageConfig) {
      if (this.imageConfig.hasOwnProperty(segmentKey)) {
        console.log(`Segment ${segmentKey}: ${this.imageConfig[segmentKey].sound}`);
      }
    }

    this.audio.init();
  }

  /**
   * play
   * Figures out which segment is at (x, y) and plays its sound/haptic.
   * (-1, -1) is a special signal meaning the user moved outside the image entirely.
   *
   * @param {number} x - touch x, in screen pixels (or -1)
   * @param {number} y - touch y, in screen pixels (or -1)
   */
  play(x, y) {
    if (!this.segmentData || this.segmentData.length === 0) {
      console.log("No segment data available");
      return;
    }

    if (x === -1 && y === -1) {
      this.audio.playSegment("-1");
      return;
    }

    const pos = this.getPos(x, y);
    const idx = pos.y * this.win.imgWidth + pos.x;

    if (idx < 0 || idx >= this.segmentData.length ||
      this.segmentData[idx] === undefined || this.segmentData[idx] === null) {
      console.log(`No segment data at index ${idx}`);
      return;
    }

    this.audio.playSegment(this.segmentData[idx].toString());
  }

  /**
   * stopSound
   * Stops whatever's currently playing.
   * @param {function} [callback]
   */
  stopSound(callback) {
    this.audio.stop(callback);
  }

  /**
   * updateVolume
   * @param {string} segmentKey
   * @param {number} newVolume
   */
  updateVolume(segmentKey, newVolume) {
    this.audio.updateVolume(segmentKey, newVolume);
  }

  /**
   * destroy
   * Tears down all audio players and playback state. Call this when the
   * screen using this SuperImage unmounts.
   */
  destroy() {
    this.audio.destroy();
  }
}