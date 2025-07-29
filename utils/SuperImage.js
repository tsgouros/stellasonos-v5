import React, {useState} from 'react';
import { OpenCV } from 'react-native-fast-opencv';
import { LineTypes, ObjectType, ThresholdTypes, ColorConversionCodes, DataTypes, ConnectedComponentsTypes, RetrievalModes, ContourApproximationModes } from 'react-native-fast-opencv';

import RNFetchBlob from 'rn-fetch-blob';
const { fs } = RNFetchBlob;

// utils/SuperImage.js
export default class SuperImage {
  constructor(complexImage, name = "") {
    console.log("--initializing SuperImage");
    // TODO: can delete global variable
    this.masterSrc = complexImage.src;
    this.title = complexImage.title;
    this.id = complexImage.id;
    this.layers = { 0: { src: complexImage.src } }; // not fully initialized?
    this.currentImageKey = 0;
    
    this.matJS = null;

    // Store a map from pixel to label id 
    // Initially empty until segmentation is performed
    this.segmentData = [];

    // TODO: to be implemented by stats
    // from each label id, store customized color/haptic/sound based on size of label
    // will be developed later
    // this.segmentRecord = { sum: 0, color: 0, haptic: 0, sound: 0 };

    // initial value for window, pixel
    this.win = {
      winWidth: 300,
      winHeight: 300,
      imgWidth: 10,
      imgHeight: 10,
    };
  }

  currentImage() {
    return this.layers[this.currentImageKey];
  }


  // TODO: from Tom's original code, compare getPos

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
    console.log(">> Loading base64 from:", this.currentImage().src);
    let imagePath;
    const resp = await RNFetchBlob.config({ fileCache: true })
      .fetch("GET", this.currentImage().src);
    imagePath = resp.path();
    const base64 = await resp.readFile("base64");
    console.log(">>>> base64 success!");
    await RNFetchBlob.fs.unlink(imagePath);
    return base64
  }

  // extract a random matJS to display intermediate images in imagePage
  // if isDisplay, add in ImagePaget return: 
  // <Image
  //   style={styles.image}
  //   source={{ uri: superImage.getMatImage() }}
  // />
  getMatImage() {
    return this.matJS?.base64 ? `data:image/png;base64,${this.matJS.base64}` : null;
  }

  // TODO: upate loadbase64, srcMatJS col and row value to this.image(imgwidth)
  async performSegmentation(imageData) {
    // TODO: check just use superimage object
    console.log("--in function: performSegmentation")
    // this.segmentData = new Array(size);

    console.log(">> loading imageData", imageData)
    const src = await this.loadBase64()
    if (!src) throw new Error("src base64 string not ready yet");
  
    console.log("----1) base64ToMat");
    const srcMat = OpenCV.base64ToMat(src);
    if (srcMat) {
      console.log("source", srcMat);
    } else {
      console.log("empty source");
    }
    const srcMatJS = OpenCV.toJSValue(srcMat); 
    // TODO: type 16 means CV_16UC3?

    // setting correct img size from srcMat
    this.win = {
      winWidth: 300,
      winHeight: 300,
      imgWidth: srcMatJS.cols || 10,
      imgHeight: srcMatJS.rows || 10,
    };
    const { imgWidth, imgHeight } = this.win;
    const size = imgWidth * imgHeight;

    console.log('----2) grayscaling...');
    // must specify size from srcMatJS, otherwise hostfunction <unknown>
    let grayMat = OpenCV.createObject(ObjectType.Mat, srcMatJS.rows, srcMatJS.cols, DataTypes.CV_16UC1);
    await OpenCV.invoke("cvtColor", srcMat, grayMat, ColorConversionCodes.COLOR_BGR2GRAY);
    // this.matJS = OpenCV.toJSValue(grayMat)
    try {OpenCV.toJSValue(grayMat)} catch (e) {console.log('grascaling error', e)}
    // console.log("grayMat", OpenCV.toJSValue(grayMat));
    // console.log('----finished grayscale')
    // TODO: check RGB or BGR --> opencv loads default to BGR

    console.log('----3) thresholding...');
    // TODO: set approproaite thresh
    let thresh = 50
    let threshMat = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8UC1);
    // TODO: compare with function "Canny"
    await OpenCV.invoke("threshold", grayMat, threshMat, thresh, 255, ThresholdTypes.THRESH_BINARY_INV);
    // used to display intermediate images
    // this.matJS = OpenCV.toJSValue(threshMat)
    try {OpenCV.toJSValue(threshMat)} catch (e) {console.log('thresholding error', e)}
    // console.log("threshMatJS", OpenCV.toJSValue(threshMat));
    // console.log('----finished thresholding')
    
    // OpenCV.invoke('Canny', source, source, 75, 100);
    console.log("----4) findContours");
    try {
      let contours = OpenCV.createObject(ObjectType.MatVector, 0, 0, DataTypes.CV_8UC1);
      let hierarchy = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8UC1);
      await OpenCV.invoke('findContoursWithHierarchy', threshMat, contours, hierarchy, RetrievalModes.RETR_TREE, ContourApproximationModes.CHAIN_APPROX_SIMPLE);
      const contoursData = OpenCV.toJSValue(contours).array; 
      console.log(contoursData);

      const labelMat = OpenCV.createObject(ObjectType.Mat, srcMatJS.rows, srcMatJS.cols, DataTypes.CV_32SC1);
      // // fill with zeros
      // await OpenCV.invoke('setTo', labelMat, OpenCV.createObject(ObjectType.Scalar, [0]));

      for (let i = 0; i < contoursData.length; ++i) {
        const contour = contoursData[i];
        const numPoints = contour.rows;
        console.log(i, numPoints);

        const color = OpenCV.createObject(ObjectType.Scalar, i + 1);
        OpenCV.invoke('drawContours', labelMat, contours, i, color, -1, LineTypes.LINE_8);

        // let color = OpenCV.createObject(ObjectType.Scalar, 
        //   Math.round(Math.random() * 255),
        //   Math.round(Math.random() * 255),
        //   Math.round(Math.random() * 255)
        // );
        // The "-1" denotes the thickness of contour lines,
        // and negative numbers make it so that the interiors are drawn.

        // no hierarchy involved
        // OpenCV.invoke('drawContours',
        //   threshMat,
        //   contours,
        //   i,
        //   color,
        //   -1,
        //   LineTypes.LINE_8
        // );
      }
      this.matJS = OpenCV.toJSValue(labelMat);
      console.log(labelMat);
      this.segmentData = OpenCV.matToBuffer(labelMat, 'int32').buffer;
      console.log(this.segmentData)
    } catch (err) {console.log(err)}

    // ===============================
    console.log("----4) connectedComponentWithStats")
    const labels = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8U);
    const stats = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_32S);
    const centroids = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_64F);
    const numLabels = await OpenCV.invoke( 'connectedComponentsWithStats', threshMat, labels, stats, centroids);
    // TODO: delete await statement
    console.log('total no. of segments', numLabels);

    console.log('>>>>inspecting labels')
    const labelsData = OpenCV.matToBuffer(labels, 'int32');
    console.log('labelsData =', labelsData);
    // where large image starts to choke
    console.log('buffer =', labelsData?.buffer);
    try {
      const keys = Object.keys(labelsData.buffer); // or use Object.entries if needed
      console.log('buffer key count =', keys.length);
      // console.log('buffer length =', labelsData.buffer.length);
      for (let i = 0; i < keys.length; i++) {
        // not printed, not in the loop???
        // if (i % 100 == 0 ) {console.log(i);}
        // this.segmentData[i] = labelsData[i];
      }
    } catch (error) {
      console.log(">>>> error accessing labels buffer: ", error)
    }

    // labelsData.buffer already returns a 1D array, assign it to segmentData -> chokes on large image
    // const idx = localY * superImage.win.imgWidth + localX;
    // this.segmentData = labelsData.buffer;
    console.log("finished loading segmentData")
    
    console.log('>>>>inspecting stats')
    const statsData = OpenCV.matToBuffer(stats, 'int32');
    console.log('statsData =', statsData);
    // console.log('buffer =', statsData?.buffer);
    console.log('buffer length =', statsData?.buffer?.length);

    console.log('inspecting segment stats: ', statsData?.buffer[0 * 5 + ConnectedComponentsTypes.CC_STAT_LEFT]);
    
    // from https://github.com/lukaszkurantdev/react-native-fast-opencv/issues/25
    // TODO: ERROR - loop wouldn't run, i or anything is not printed
    for (let i = 0; i < numLabels; i++) {
      console.log("Inspecting segment #", i);
      console.log(ConnectedComponentsTypes.CC_STAT_LEFT)
      const x = statsData?.buffer[i * 5 + ConnectedComponentsTypes.CC_STAT_LEFT];
      const y = statsData?.buffer[i * 5 + ConnectedComponentsTypes.CC_STAT_TOP];
      const width = statsData?.buffer[i * 5 + ConnectedComponentsTypes.CC_STAT_WIDTH];
      const height = statsData?.buffer[i * 5 + ConnectedComponentsTypes.CC_STAT_HEIGHT];
      const area = statsData?.buffer[i * 5 + ConnectedComponentsTypes.CC_STAT_AREA];
      console.log(`Component ${i}: x=${x.toFixed(2)}, y=${y.toFixed(2)}, width=${width.toFixed(2)}, height=${height.toFixed(2)}, area=${area?.toFixed(2)}`);
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
      `>>>> SuperImage.performSegmentation(): segmentation finished with size ${size}`
    );
    // OpenCV.clearBuffers();
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
    console.log(">> SuperImage.stopSound(): Sound stopped");
  }

  return 

}
