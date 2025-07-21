import React, {useState} from 'react';
import { OpenCV } from 'react-native-fast-opencv';
import { ObjectType, ThresholdTypes, ColorConversionCodes, DataTypes } from 'react-native-fast-opencv';

import RNFetchBlob from 'rn-fetch-blob';
const { fs } = RNFetchBlob;

// utils/SuperImage.js
export default class SuperImage {
  constructor(complexImage, name = "") {
    console.log("--initializing SuperImage (bare-bones)");
    this.masterSrc = complexImage.src;
    this.title = complexImage.title;
    this.id = complexImage.id;
    this.layers = { 0: { src: complexImage.src } }; // not fully initialized?
    this.currentImageKey = 0;
    
    this.base64 = null;

    // Store a map from pixel to label id 
    // Initially empty until segmentation is performed
    this.segmentData = [];

    // from each label id, store customized color/haptic/sound based on size of label
    // will be developed later
    // this.segmentRecord = { sum: 0, color: 0, haptic: 0, sound: 0 };

    // initializing value for win
    this.win = {
      winWidth: 300,
      winHeight: 300,
      imgWidth: 10,
      imgHeight: 10,
    };

    const [numLabels, setNumLabels] = useState(0);
    const [statsData, setStatsData] = useState([]);
    const [centroidsData, setCentroidsData] = useState([]);
    const [segmentData, setSegmentData] = useState(new Int16Array(this.win.imgWidth * this.win.imgHeight).fill(0));
  }

  currentImage() {
    return this.layers[this.currentImageKey];
  }

  // Accept window coordinates, return image coordinates.
  // getPos(x, y) {
  //   var yr = (this.win.totalHeight - this.win.winHeight) / 2;
  //   return {
  //     x: Math.round((x / this.win.winWidth) * this.win.imgWidth),
  //     y: Math.round(((y - yr) / this.win.winHeight) * this.win.imgHeight),
  //   };
  // }

  // just return window coordinates
  getPos(x, y) {
    return {
      x: Math.min(
        Math.max(Math.floor((x / this.win.winWidth) * this.win.imgWidth), 0),
        this.win.imgWidth - 1
      ),
      y: Math.min(
        Math.max(Math.floor((y / this.win.winHeight) * this.win.imgHeight), 0),
        this.win.imgHeight - 1
      ),
    };
  }

  // temporily download image from url, then load it as a base64 string
  async loadBase64() {
    console.log("---- Loading base64 from:", this.currentImage().src);
    let imagePath;

    try {
      const resp = await RNFetchBlob.config({ fileCache: true })
        .fetch("GET", this.currentImage().src);
      imagePath = resp.path();
      // console.log("downloaded to ", imagePath)

      this.base64 = await resp.readFile("base64");
      console.log("---- base64 success!");
      await RNFetchBlob.fs.unlink(imagePath);
    } catch (err) {
      console.error("-- RNFetchBlob error:", err);
    }
  }

  // todo: upate loadbase64, srcMatJS col and row value to this.image(imgwidth)
  async performSegmentation(imageData) {
    // check： just use superimage object
    console.log("--in performSegmentation")
    this.segmentData = new Array(size);

    console.log("imageData", imageData)
    await this.loadBase64()
    if (!this.base64) throw new Error("Base64 not ready yet");
  
    console.log("----1) base64ToMat");
    const srcMat = OpenCV.base64ToMat(this.base64);
    if (srcMat) {
      console.log("source", srcMat);
    } else {
      console.log("empty source");
    }
    const srcMatJS = OpenCV.toJSValue(srcMat);  
    console.log("srcMatJS", srcMatJS)
    // type 16 means CV_16UC3?

    // setting img size from srcMat
    this.win = {
      winWidth: 300,
      winHeight: 300,
      imgWidth: srcMatJS.cols || 10,
      imgHeight: srcMatJS.rows || 10,
    };

    const { imgWidth, imgHeight } = this.win;
    const size = imgWidth * imgHeight;

    // console.log("srcMat:jsvalue", srcMatJS);
    // console.log('srcMat.type', srcMatJS.type);  

    console.log('----2) grayscaling...');
    // must specify size from srcMatJS, otherwise hostfunction <unknown>
    let grayMat = OpenCV.createObject(ObjectType.Mat, srcMatJS.rows, srcMatJS.cols, DataTypes.CV_16UC1);
    await OpenCV.invoke("cvtColor", srcMat, grayMat, ColorConversionCodes.COLOR_BGR2GRAY);
    console.log("grayMat", OpenCV.toJSValue(grayMat));
    console.log('----finished grayscale')
    // TODO: check RGB or BGR --> opencv loads default to BGR

    console.log('----3) thresholding...');
    let thresh = 50
    // need to specify size?
    let threshMat = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8UC1);
    // TODO: compare with function "Canny"
    await OpenCV.invoke("threshold", grayMat, threshMat, thresh, 255, ThresholdTypes.THRESH_BINARY_INV);
    console.log("threshMatJS", OpenCV.toJSValue(threshMat));
    console.log('----finished thresholding')
    
    console.log("----4) connectedComponentWithStats")
    try {
      const labels = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8U);
      const stats = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_32S);
      const centroids = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_64F);
      const { numLabels } = OpenCV.invoke('connectedComponentsWithStats', threshMat, labels, stats, centroids);
      console.log('connectedComponents numLabels:', numLabels);
      // setNumLabels(numLabels);

      // from https://github.com/lukaszkurantdev/react-native-fast-opencv/issues/25
      const statsData = OpenCV.matToBuffer(stats, 'int32');
      for (let i = 0; i < numLabels; i++) {
        const x = statsData?.buffer[i * 5 + ConnectedComponentsTypes.CC_STAT_LEFT];
        const y = statsData?.buffer[i * 5 + ConnectedComponentsTypes.CC_STAT_TOP];
        const width = statsData?.buffer[i * 5 + ConnectedComponentsTypes.CC_STAT_WIDTH];
        const height = statsData?.buffer[i * 5 + +ConnectedComponentsTypes.CC_STAT_HEIGHT];
        const area = statsData?.buffer[i * 5 + +ConnectedComponentsTypes.CC_STAT_AREA];
        console.log(`Component ${i}: x=${x.toFixed(2)}, y=${y.toFixed(2)}, width=${width.toFixed(2)}, height=${height.toFixed(2)}, area=${area?.toFixed(2)}`);
      }
    } catch (error) {
      console.log("connectComponents error", error)
    } 
    // fills segmentData
    // for (let y = 0; y < imgHeight; y++) {
    //   for (let x = 0; x < imgWidth; x++) {
    //     let segment;
    //     const halfWidth = imgWidth / 2;
    //     const halfHeight = imgHeight / 2;

    //     if (x < halfWidth && y < halfHeight) segment = 0; // top-left
    //     else if (x >= halfWidth && y < halfHeight) segment = 1; // top-right
    //     else if (x < halfWidth && y >= halfHeight) segment = 2; // bottom-left
    //     else segment = 3; // bottom-right

    //     this.segmentData[y * imgWidth + x] = segment;
    //   }
    // }

    console.log(
      `>>> SuperImage.performSegmentation(): Quad segmentation with size ${size} created`
    );
  }
  
  getColorAt(x, y, touchAreaWidth, touchAreaHeight) {
    const localX = Math.floor((x / touchAreaWidth) * this.win.imgWidth);
    const localY = Math.floor((y / touchAreaHeight) * this.win.imgHeight);

    const idx =
      Math.min(Math.max(localY, 0), this.win.imgHeight - 1) * this.win.imgWidth +
      Math.min(Math.max(localX, 0), this.win.imgWidth - 1);

    const segment = this.segmentData[idx];

    if (segment === 0) return "#000000"; // black
    else if (segment === 1) return "#00ffff"; // cyan
    else if (segment === 2) return "#ff00ff"; // magenta for quadrant 2
    else if (segment === 3) return "#ffa500"; // orange for quadrant 3
    else return "#ffffff"; // white fallback
  }

  play(x, y) {
    const pos = this.getPos(x, y);
    console.log(pos)
    const idx = pos.y * this.win.imgWidth + pos.x;
    const segment = this.segmentData[idx];
    console.log(`Playing segment ${segment} at pixel (${pos.x}, ${pos.y})`);
    // Could trigger sound or haptics here
  }

  stopSound() {
    console.log(">>> SuperImage.stopSound(): Sound stopped");
  }

}
