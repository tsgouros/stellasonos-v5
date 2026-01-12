import { Animated } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Player } from '@react-native-community/audio-toolkit';
import { Vibration } from 'react-native';
import ironicConfig from '../utils/ironicConfig.json';

import RNFetchBlob from 'rn-fetch-blob';
import { AdaptiveThresholdTypes, OpenCV } from 'react-native-fast-opencv';
import { ObjectType, ThresholdTypes, ColorConversionCodes, DataTypes, ConnectedComponentsTypes, RetrievalModes, ContourApproximationModes, InterpolationFlags } from 'react-native-fast-opencv';


import { useState } from './ImagePage';

export default class SuperImage {
 constructor(complexImage, name = "") {
   console.log("initializing SuperImage with audio integration");

   this.masterSrc = complexImage.src;
   this.title = complexImage.title;
   this.id = complexImage.id;
   
   this.win = {
     winWidth: 300,
     winHeight: 300,
     imgWidth: 10,
     imgHeight: 10,
   };

   // FIX 1: Store the image-specific config on the instance (CRITICAL for config access)
   this.imageConfig = ironicConfig.colors[this.title] || {};

   this.layers = { 0: { src: complexImage.src } };
   this.currentImageKey = 0;

   // SEGMENTATION & AUDIO PROPERTIES
   this.segmentData = [];
   this.starData = {};
   this.displaySeg = new Array();
   this.segmentRecords = new Map(); // Stores segment info, touch count, sound/haptic config

   this.pan = new Animated.ValueXY();
   this.canTriggerVibration = true;
   this.initialVolume = ironicConfig.initialVolume || 1.0;
   this.players = {}; // Stores the initialized Player objects
   this.isPlaying = false;
   this.switchInterval = 5000;

   this.activeSegment = null;
   this.activePlayer = null;
   this.pendingStop = false;
   this.lastSegment = null;

 }


 initAudioPlayers() {
   const imageConfig = this.imageConfig;
   if (!imageConfig || Object.keys(imageConfig).length === 0) {
       console.warn(`No ironicConfig found for title: ${this.title}`);
       return;
   }

   for (let segmentKey in imageConfig) {
     if (imageConfig.hasOwnProperty(segmentKey)) {
       const segmentConfig = imageConfig[segmentKey];
       const { sound: soundUrl, volume } = segmentConfig;
      
       // FIX 2: Ensure segmentRecords is fully populated with all config data
       this.segmentRecords.set(segmentKey, {
           ...segmentConfig,
           count: 0
       });

       if (soundUrl) {
         try {
          // FIX: object creation await 
          this.players[segmentKey] = new Player(soundUrl, {
             autoDestroy: false,
             continuesToPlayInBackground: false
           }); // FIX: await to initialize object
           console.log(this.players)
           console.log(segmentKey) // FIX: check if sequence mixed, order if it sowkred
           setTimeout()

           // Prepare is async, this must happen before play can succeed
           this.players[segmentKey].prepare((err) => {
             if (!err) {
               // Ensure volume is set after preparation
               this.players[segmentKey].volume = volume || this.initialVolume;
               console.log(`Player for segment ${segmentKey} prepared successfully`);
             } else {
               console.error(`Error preparing player for segment ${segmentKey}:`, err);
               // Retrying to prepare after a short delay
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

//  getPos(x, y) {
   
//    return {
//      x: Math.min(Math.max(Math.floor((x / this.win.winWidth) * this.win.imgWidth), 0), this.win.imgWidth - 1),
//      y: Math.min(Math.max(Math.floor((y / this.win.winHeight) * this.win.imgHeight), 0), this.win.imgHeight - 1),
//    };
//  }

 getPos(x, y) {
  //  const { shouldRotate } = useRotation();
  shouldRotate=true
   if (shouldRotate) {
      mx = (y / this.win.winHeight) * this.win.imgWidth;
      my = ((this.win.winWidth - x) / this.win.winWidth) * this.win.imgHeight;
      // // 90° clockwise
      // mx = (y / this.win.winHeight) * this.win.imgWidth;
      // my = (1 - x / this.win.winWidth) * this.win.imgHeight;
    } else {
      // normal (no rotation)
      mx = (x / this.win.winWidth) * this.win.imgWidth;
      my = (y / this.win.winHeight) * this.win.imgHeight;
    }
   return {mx,my};
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

   console.log(this.segmentData)
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
   console.log("-- Loading base64 from:", this.currentImage().src);
   console.log(this.currentImage().src)
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

// function is called in ImagePage to return the base64 of the segmentaiton debugging png. raw array->mat->png->base64
async inspectSegments() {
  console.log("6) display and inspect segmentation...");
  try {
    // **** code to render a colored square
    // const width = 100;
    // const height = 100;
    // const rgba = new Array(width * height * 4).fill(0);

    // for (let y = 30; y < 70; y++) {
    //   for (let x = 30; x < 70; x++) {
    //     const idx = (y * width + x) * 4;
    //     rgba[idx + 0] = 0; // B
    //     rgba[idx + 1] = 0;   // G
    //     rgba[idx + 2] = 255;   // R
    //     rgba[idx + 3] = 255; // A
    //   }
    // }
    // ****

    const mat = OpenCV.createObject(ObjectType.Mat,this.win.imgHeight,this.win.imgWidth,DataTypes.CV_8UC4,this.displaySeg);
    console.log(this.win.imgHeight,this.win.imgWidth)
    const jsValue = OpenCV.toJSValue(mat, 'png');
    const uri = `data:image/png;base64,${jsValue.base64}`;
    console.log("uri",uri)
    return uri 
} catch (e) {console.log(e);}

}

 to1DCoordinate(x, y) {
   return x + y * this.win.imgWidth;
 } 

 fillRGBArray(i,r,g,b,a) {
  // react-native-fast-opencv renders in bgra sequence
  this.displaySeg[i * 4 + 0] = b;
  this.displaySeg[i * 4 + 1] = g;
  this.displaySeg[i * 4 + 2] = r;
  this.displaySeg[i * 4 + 3] = a; // alpha
 }

 async performSegmentation() {
   // TODO: check just use superimage object
   console.log(">>>> in function: performSegmentation");

   const src = await this.loadBase64()
   if (!src) throw new Error("src base64 string not ready yet");
   console.log("----1) base64ToMat");
   const srcMat = OpenCV.base64ToMat(src);
   console.log("source", srcMat);
   //  const srcMatJS = OpenCV.toJSValue(srcMat);
   //  this.win.imgHeight = srcMatJS.cols
   //  this.win.imgWidth = srcMatJS.rows


   // ***** need resizing bc 1/3 outputs optimal speed and resolution
   console.log("----2) resize: factor 1/3")
   let resizeMat = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_16UC1);
   let dsize = OpenCV.createObject(ObjectType.Size, 0, 0)
   await OpenCV.invoke("resize",srcMat,resizeMat,dsize,1/3,1/3,InterpolationFlags.INTER_AREA)
   let resizeMatJS = OpenCV.toJSValue(resizeMat)
   this.win.imgHeight = resizeMatJS.rows
   this.win.imgWidth = resizeMatJS.cols
   console.log("resizeMat", this.win)
   // after resizing, initialize the correct size of displaySeg
   this.displaySeg = new Array(this.win.imgHeight*this.win.imgWidth*4).fill(0)


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


   console.log('----5) ConnectedComponent...');
   try {
     // **** use OpenCV to find the components
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

     // **** clean components
     let areas = [];
     // label 0 is background, skip that, we'll assign them
     for (let label = 1; label < numSegment.value; label++) {
       const area = statsArray[label * 5 + ConnectedComponentsTypes.CC_STAT_AREA];
       areas.push({ label, area });
     }
     // sort descending by area
     areas.sort((a, b) => b.area - a.area);
     console.log("segment areas sorted: ", areas);

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

     // 0 is background(skipped), 1 is the largest "meaningful" segment
     var maxSegment = 10
     let largeSegments = areas.slice(0, maxSegment);
     console.log("segment areas largest cut: ", maxSegment, largeSegments);
     // for easy concat to this.segmentData, only contains from 1=10 meaningful segments
     const topLabels = largeSegments.map(seg => seg.label);
     // console.log(topLabels);

     // **** loop through each pixel to populate segmentData
     let countStar = 0
     // console.log(this.win.imgHeight, this.win.imgWidth)
     for (let y = 0; y < this.win.imgHeight; y++) {
       for (let x = 0; x < this.win.imgWidth; x++) {
         const idx = this.to1DCoordinate(x, y);
         const label = labelArray[idx];
         const area = statsArray[label * 5 + ConnectedComponentsTypes.CC_STAT_AREA];
         // Debug: check pixel index, its segment ID, and the segment's area
         // console.log("Pixel index:", idx, "Segment ID:", label, "Area:", area);

         // small segments: stars, play a clinging sound, assign to label=1
         if (area >= 10 && area <= 40) {
           this.starData[idx] = label;
           this.segmentData[idx] = 1;
           countStar++;
           this.fillRGBArray(idx,255,255,0,255); // fill small segments as yellow
           continue;
         }
         // max 10 meaningful segments: assign to sorted label+2 due to bg=0, starLabel=1
         // retrieves the index of that maxLabel from sorted array (index=0 means it's the largest meaningful segment)
         const maxRank = topLabels.indexOf(label);
         if (maxRank !== -1) {
           this.segmentData[idx] = maxRank + 2;
           const redness = Math.floor(50 + maxRank * (205 / 9));
           this.fillRGBArray(idx,redness,0,0,255); // fill meaningful segments as varying red
          //  console.log("check drawSegment", this.drawSegment[idx]);
           continue;
         }
         // if (topLabels.includes(label)) {
         //   this.segmentData[idx] = topLabels.indexOf[label] + 2;
         //   // but label is not necessaily
         //   continue;
         // }

         // original background + medium-sized segments: push the rest label=0=background
         this.segmentData[idx] = 0;
         this.fillRGBArray(idx,0,0,255,255); // fill the rest/bg as blue
       }
     }
     console.log("FINAL: Counted stars # ", countStar, this.starData, this.segmentData)
   } catch (error) {
     console.error('Error in performSegmentation:', error);
   } 


   OpenCV.clearBuffers();
   console.log("displaySeg:", this.displaySeg);
   console.log(
     `>>>> SuperImage.performSegmentation(): segmentation finished.`
   );

   // *************SOUND component**************

   console.log("Audio URLs being used:");
   // Using cached config
   for (let segmentKey in this.imageConfig) {
     if (this.imageConfig.hasOwnProperty(segmentKey)) {
       const segmentConfig = this.imageConfig[segmentKey];
       console.log(`Segment ${segmentKey}: ${segmentConfig.sound}`);
     }
   }

   // for (let y = 0; y < imgHeight; y++) {
   //   for (let x = 0; x < imgWidth; x++) {
   //     let segment;
   //     if (x === 0 || y === 0 || x === imgWidth - 1 || y === imgHeight - 1) segment = -1;
   //     else if (x < imgWidth / 2 && y < imgHeight / 2) segment = 0;
   //     else if (x >= imgWidth / 2 && y < imgHeight / 2) segment = 1;
   //     else if (x < imgWidth / 2 && y >= imgHeight / 2) segment = 2;
   //     else segment = 3;
   //     this.segmentData[y * imgWidth + x] = segment;
   //   }
   // }
   console.log("pre first 'prepare'")
   this.initAudioPlayers(); // 
   console.log("post first 'prepare'")
   // Removed the problematic completionSound block
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

   console.log("x,y", x,y)
   const pos = this.getPos(x, y);
   console.log("pos", pos)
   const idx = pos.my * this.win.imgWidth + pos.mx;
   console.log("idx", idx)
   console.log("win", this.win)


   // FIXED: Check if segment exists at this index
   if (idx < 0 || idx >= this.segmentData.length ||
     this.segmentData[idx] === undefined || this.segmentData[idx] === null) {
     console.log(`No segment data at index ${idx}`);
     return;
   }


   console.log(this.segmentData)
   const segmentValue = this.segmentData[idx];
   const segmentKey = segmentValue.toString();


   this.playSegmentSound(segmentKey);
 }


 // NEW METHOD: Handle segment sound playback
 playSegmentSound(segmentKey) {
   const segmentInfo = this.segmentRecords.get(segmentKey);
  
   // Increment touch count (for info box)
   if (segmentInfo) {
     segmentInfo.count = (segmentInfo.count || 0) + 1;
     this.segmentRecords.set(segmentKey, segmentInfo);
   }


   if (segmentKey === this.lastSegment) {
     return;
   }


   this.lastSegment = segmentKey;


   if (!this.players[segmentKey]) {
     console.log(`No audio player found for segment ${segmentKey}. Checking for haptic...`);
     // Fallthrough to trigger haptic even without sound
   }


   if (this.activeSegment === segmentKey) {
     this.restartCurrentSound();
     return;
   }


   this.stopSound(() => {
     this.activePlayer = this.players[segmentKey];
     this.activeSegment = segmentKey;


     // Use cached config
     const segmentConfig = this.imageConfig[segmentKey];
     if (!segmentConfig) {
       console.log(`No config found for segment ${segmentKey}`);
       return;
     }


     // Haptic feedback should happen regardless of audio success
     const hapticConfig = segmentConfig.haptic;
     if (hapticConfig) this.triggerHaptic(hapticConfig);
    
     if (this.activePlayer) {
       // FIX 3: Critical check if player is prepared before playing
       if (this.activePlayer.isPrepared) {
         this.activePlayer.play((err) => {
           if (err) {
             console.error(`Error playing sound for segment ${segmentKey}:`, err);
             // The sound may have failed to play even if prepared (e.g., resource issue)
             return;
           }
           this.isPlaying = true;
           if (segmentConfig.switchPlayer) this.scheduleSwitch();
         });
       } else {
            // If not prepared yet (network lag), log a warning.
            console.warn(`Player for segment ${segmentKey} is not prepared yet. Skipping play.`);
       }
     }
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
   clearTimeout(this.switchTimer);
  
   // Only attempt to stop if a player is active
   if (this.activePlayer) {
     // Check if it's currently playing to prevent unnecessary errors
     if (this.activePlayer.isPlaying) {
        this.activePlayer.stop(() => {
          if (callback) callback();
        });
     } else {
        // Not playing, just call callback
        if (callback) callback();
     }
   } else if (callback) {
     callback();
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