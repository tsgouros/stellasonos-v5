import React, {useState, useEffect} from 'react';
import {View,Image,ActivityIndicator} from "react-native";
import RNFetchBlob from 'rn-fetch-blob';
import kMeans from "../utils/kmeans.js"
// import { convertToRGB } from 'react-native-image-to-rgb';
import { OpenCV } from 'react-native-fast-opencv';
import { LineTypes, ObjectType, ThresholdTypes, ColorConversionCodes, DataTypes, ConnectedComponentsTypes, RetrievalModes, ContourApproximationModes, InterpolationFlags } from 'react-native-fast-opencv';


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


  // TODO: Tiffany, rotation getPos
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
    await RNFetchBlob.fs.unlink(imagePath);
    return base64
  }


  // extract a specified matJS to display intermediate images in imagePage
  // assign this.matJS = images-to-be-displayed
  // if isDisplay, add in ImagePage return:
  // <Image
  //   style={styles.image}
  //   source={{ uri: superImage.getMatImage() }}
  // />
  getMatImage() {
    return this.matJS?.base64 ? `data:image/png;base64,${this.matJS.base64}` : null;
  }


  async image2rgb(url) {
    const rgbFlat = await convertToRGB(url);
    console.log("rbgFlat: ", rgbFlat)


    const numPixels = rgbFlat.length / 3;
    const pixels = new Array(numPixels);


    // or let kmean reads in a flat array?
    for (let p = 0, i = 0; p < numPixels; p++, i += 3) {
      // console.log("inside for loop")
      if (p % 10000 === 0) console.log(p);
      pixels[p] = [rgbFlat[i], rgbFlat[i + 1], rgbFlat[i + 2]];
    }
    return pixels
    // // linear loop takes a long time
    // const pixels = [];
    // for (let i = 0; i < rgbFlat.length; i += 3) {
    //   pixels.push([rgbFlat[i], rgbFlat[i + 1], rgbFlat[i + 2]]);
    // }
    // return pixels
  }


  async kmeans(rgbData, NUM_CLUSTERS=4) {
    // var kMeans = require('../utils/kmeans');
    console.log("kMeans: ", kMeans)
    // just a new kMeans object, so could call other function too
    this.km = new kMeans({
      K: NUM_CLUSTERS
    });
    console.log("km: ", this.km)


    this.km.cluster(rgbData);
    while (this.km.step()) {
        this.km.findClosestCentroids();
        this.km.moveCentroids();


        // console.log(km.centroids);
        if(this.km.hasConverged()) break;
    }


    console.log('Finished in:', this.km.currentIteration, ' iterations');
    console.log("centroids, cluster: ", this.km.centroids, this.km.clusters);
    console.log("final segmentData:", this.km.segmentData);
    // const centroidsData = this.km.centroids
    // const clustersData = this.km.clusters
    // console.log(centroidsData, clustersData);
    // return { centroidsData, clustersData };
  }


  // try with canny then floodfill


  // looping through each pixel, could add during creation
  async posterize(len) {
    const numPixels = len; // width * height
    var pixelData = []
    for (let i = 0; i < numPixels; i++) {
      const clusterId = this.km.clusters[i];
      const color = this.km.centroids[clusterId] || [0, 0, 0]; // fallback black


      // OpenCV Mat data order: B, G, R (not RGB)
      pixelData[i * 3] = color[2];     // B channel  (note the swap RGB -> BGR)
      pixelData[i * 3 + 1] = color[1]; // G channel
      pixelData[i * 3 + 2] = color[0]; // R channel
    }
    console.log(pixelData)


    const mat = OpenCV.createObject(ObjectType.Mat, 50, 100, DataTypes.CV_8UC3, pixelData); // 3-channel color mat
    console.log(mat)
   
    return OpenCV.toJSValue(mat)


    // const numPixels = len; // total pixels = width * height
    // const outputRGB = new Uint8ClampedArray(numPixels); // or normal Array


    // for (let i = 0; i < numPixels; i++) {
    //   const clusterId = clusterIndices[i];
    //   const color = clusterColors[clusterId] || [0, 0, 0]; // fallback black
     
    //   outputRGB[i * 3] = color[0];
    //   outputRGB[i * 3 + 1] = color[1];
    //   outputRGB[i * 3 + 2] = color[2];
    // }


    // // Create an empty Uint8ClampedArray for RGBA (ImageData format)
    // const output = new Uint8ClampedArray(len);


    // clusters.forEach((pixelIndices, clusterIndex) => {
    //   const [r, g, b] = centroids[clusterIndex];
    //   pixelIndices.forEach((pixelIdx) => {
    //     const baseIdx = pixelIdx * 4; // RGBA stride
    //     output[baseIdx] = r;
    //     output[baseIdx + 1] = g;
    //     output[baseIdx + 2] = b;
    //     output[baseIdx + 3] = 255; // fully opaque
    //   });
    // });


    // return output; // can be passed to Canvas/ImageData/etc.
  }




  // TODO: upate loadbase64, srcMatJS col and row value to this.image(imgwidth)
  async performSegmentation() {
    // TODO: check just use superimage object
    console.log("--in function: performSegmentation");
    // this.segmentData = new Array(size);


    // const pixelData = await extractPixels(base64Image);
    // const kmeansResult = await runKMeans(pixelData, NUM_CLUSTERS);
    // const recolored = rebuildImage(pixelData, kmeansResult.clusters, kmeansResult.index);
    // const newImageUri = await renderImage(recolored);
    // setSegmentedUri(newImageUri);


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
    // this.matJS = OpenCV.toJSValue(resizeMat)
    // console.log("resizeMat", OpenCV.toJSValue(resizeMat))


    console.log('----3) grayscaling...');
    // must specify size from srcMatJS, otherwise hostfunction <unknown>
    let grayMat = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_16UC1);
    await OpenCV.invoke("cvtColor", resizeMat, grayMat, ColorConversionCodes.COLOR_BGR2GRAY);
    // this.matJS = OpenCV.toJSValue(grayMat)
    // console.log("grayMat", OpenCV.toJSValue(grayMat));


    console.log('----4) thresholding...');
    // TODO: set approproaite thresh
    let thresh = 50
    let threshMat = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8UC1);
    await OpenCV.invoke("threshold", grayMat, threshMat, thresh, 255, ThresholdTypes.THRESH_BINARY);
    this.matJS = OpenCV.toJSValue(threshMat)
    // console.log("threshMat", OpenCV.toJSValue(threshMat));


    console.log('----5) Canny...');
    let edgeMat = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8UC1);
    // thresh1, thresh2 not effective because image is already a bitmap
    await OpenCV.invoke("Canny", threshMat, edgeMat, 100, 200)
    // this.matJS = OpenCV.toJSValue(edgeMat)
    // console.log("Canny edgeMat", OpenCV.toJSValue(edgeMat));


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
      console.log('labelsData =', labelsData, labelArray);


      const statsData = OpenCV.matToBuffer(stats, 'int32');
      const statsArray = new Int32Array(statsData.buffer);
      console.log('statsData = ', statsData, statsArray)


    // connectedComponent return numSegment as an object -- fetch its .value; that's why couldn't go into loops for so long!
      for (let i = 0; i < numSegment.value; i++) {
        const x = statsArray[i * 5 + ConnectedComponentsTypes.CC_STAT_LEFT];
        const y = statsArray[i * 5 + ConnectedComponentsTypes.CC_STAT_TOP];
        const width = statsArray[i * 5 + ConnectedComponentsTypes.CC_STAT_WIDTH];
        const height = statsArray[i * 5 + ConnectedComponentsTypes.CC_STAT_HEIGHT];
        const area = statsArray[i * 5 + ConnectedComponentsTypes.CC_STAT_AREA];
        // TODO: draw boxes on the image, representing found components
        // TODO: use floodfill to color image, or contourArea
        if (area <= 5) {
          // TODO: record that on a discarded array of that label
          // TODO: later when filling the labelsData->segmentData don't include that label
          // TODO: the region with max area is the background, remove
          continue;
        }
        console.log(`Component ${i}: x=${x.toFixed(2)}, y=${y.toFixed(2)}, width=${width.toFixed(2)}, height=${height.toFixed(2)}, area=${area?.toFixed(2)}`);
       
      }  
    // console.log("connectedComponents edgeMat", numSegment, labels, stats, centroids);
    } catch (err) {console.log(err)}


    // console.log(">> image2rgb")
    // // const rgbData = await this.image2rgb(this.currentImage().src);
    // console.log("rbgData: ", rgbData);


    // try {
    //   // await this.kmeans(rgbData);
    //   // this.matJS = await this.posterize(rgbData.length);
    // } catch (err) {console.log(err)}


    // TODO: Tiffany, setting true img size
    // setting correct img size from srcMat
    this.win = {
      winWidth: 300,
      winHeight: 300,
      imgWidth: srcMatJS.cols || 10,
      imgHeight: srcMatJS.rows || 10,
    };
    const { imgWidth, imgHeight } = this.win;
    const size = imgWidth * imgHeight;


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
