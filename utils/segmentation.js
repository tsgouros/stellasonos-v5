// ─────────────────────────────────────────────────────────────────────────
// segmentation.js
//
// Everything related to turning a raw image into a segmented pixel map
// lives in this file. Nothing in here knows about audio, haptics, or
// React — it only takes image data in and hands segment data back out.
//
// WHY THIS FILE EXISTS:
// This is meant to be a swappable unit. If we want to replace the
// "adaptive threshold + connected components" approach with something
// else (e.g. the discontinued k-means version in utils/kmeans/, or a
// future ML-based approach), the only thing that has to change is this
// file. As long as the new version still exports a `runSegmentation`
// function with the same inputs/outputs described below, nothing in
// SuperImage.js or any page needs to change.
//
// See docs/CODE_OVERVIEW.md for the full picture of how this fits
// together with the rest of the app.
// ─────────────────────────────────────────────────────────────────────────

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

/**
 * fetchImageAsBase64
 * Downloads an image from a URL and returns it as a base64 string.
 * Cleans up the temp file it downloads to before returning.
 *
 * @param {string} src - image URL
 * @returns {Promise<string>} base64-encoded image data
 */
export async function fetchImageAsBase64(src) {
  console.log("-- Loading base64 from:", src);
  const resp = await RNFetchBlob.config({ fileCache: true }).fetch("GET", src);
  const imagePath = resp.path();
  const base64 = await resp.readFile("base64");
  await RNFetchBlob.fs.unlink(imagePath);
  return base64;
}

/**
 * resizeImage
 * Resizes the image to 1/3 of its original size so segmentation runs faster.
 * Side effect: writes the resulting width/height onto `win.imgWidth` /
 * `win.imgHeight`, since every later step needs to know the working image size.
 *
 * @param {Mat} srcMat - OpenCV Mat of the full-size source image
 * @param {object} win - mutable size-tracking object; imgWidth/imgHeight get overwritten
 * @returns {Promise<Mat>} the resized OpenCV Mat
 */
export async function resizeImage(srcMat, win) {
  const resizeMat = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_16UC1);
  const dsize = OpenCV.createObject(ObjectType.Size, 0, 0);
  await OpenCV.invoke("resize", srcMat, resizeMat, dsize, 1/3, 1/3, InterpolationFlags.INTER_AREA);
  const resizeMatJS = OpenCV.toJSValue(resizeMat);
  win.imgHeight = resizeMatJS.rows;
  win.imgWidth = resizeMatJS.cols;
  return resizeMat;
}

/**
 * applyThreshold
 * Converts the image to grayscale, then applies adaptive threshold.
 * Adaptive threshold handles uneven lighting better than a single fixed
 * cutoff would, since it looks at each pixel's local neighborhood.
 *
 * @param {Mat} resizeMat - OpenCV Mat, output of resizeImage
 * @param {number} [neighbor=61] - size of the local neighborhood used per-pixel
 * @returns {Promise<Mat>} black/white thresholded Mat
 */
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

/**
 * runConnectedComponents
 * Runs OpenCV's connected-components analysis on the thresholded image,
 * which groups touching foreground pixels into labeled blobs ("segments").
 *
 * @param {Mat} threshMat - OpenCV Mat, output of applyThreshold
 * @returns {Promise<{ labelArray: Int32Array, statsArray: Int32Array, numSegment: {value: number} }>}
 *   labelArray - one entry per pixel: which segment label it belongs to
 *   statsArray - one entry per label × 5 fields (area, bbox, etc.), see ConnectedComponentsTypes
 *   numSegment - total number of labels found (including background label 0)
 */
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

/**
 * getTopSegmentLabels
 * Sorts all segments by area (largest first) and returns the top N label IDs.
 * Label 0 is always OpenCV's background label, so it's always skipped.
 *
 * @param {Int32Array} statsArray - from runConnectedComponents
 * @param {{value: number}} numSegment - from runConnectedComponents
 * @param {number} [maxSegment=10] - how many top labels to keep
 * @returns {number[]} label IDs, largest area first
 */
export function getTopSegmentLabels(statsArray, numSegment, maxSegment = 10) {
  const areas = [];
  for (let label = 1; label < numSegment.value; label++) {
    const area = statsArray[label * 5 + ConnectedComponentsTypes.CC_STAT_AREA];
    areas.push({ label, area });
  }
  areas.sort((a, b) => b.area - a.area);
  return areas.slice(0, maxSegment).map(seg => seg.label);
}

/**
 * classifyPixels
 * Walks every pixel and assigns it to one of three buckets:
 *   - Stars (tiny 10–40px specks) → segmentData label 1, colored yellow
 *   - Top 10 meaningful segments  → segmentData label 2–11, colored varying red
 *   - Everything else (noise/bg)  → segmentData label 0, colored blue
 *
 * Mutates `segmentData`, `starData` in place, and calls `fillRGBArray` once
 * per pixel to paint a display buffer owned by the caller.
 *
 * @param {object} win - { imgWidth, imgHeight } of the working image
 * @param {Int32Array} labelArray - from runConnectedComponents
 * @param {Int32Array} statsArray - from runConnectedComponents
 * @param {number[]} topLabels - from getTopSegmentLabels
 * @param {Array} segmentData - OUT: one entry per pixel, the final segment id (mutated)
 * @param {object} starData - OUT: star pixels keyed by index (mutated)
 * @param {function} fillRGBArray - callback(idx, r, g, b, a) to paint a display buffer
 * @returns {number} countStar - how many star pixels were found
 */
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

/**
 * runSegmentation
 * The single entry point for the whole segmentation pipeline:
 * download → resize → threshold → connected components → classify.
 *
 * This is the function everything outside this file should call — the
 * six functions above are exported individually in case they're useful
 * on their own, but `runSegmentation` is the "contained" unit. To swap
 * out the segmentation approach entirely, replace the body of this
 * function (and/or the helpers above) while keeping this signature.
 *
 * @param {string} imageSrc - URL of the image to segment
 * @param {object} win - mutable size object { winWidth, winHeight, imgWidth, imgHeight }.
 *                        imgWidth/imgHeight get overwritten once the real size is known.
 * @param {Array} segmentData - OUT: mutated in place, one entry per pixel
 * @param {object} starData - OUT: mutated in place, star pixels keyed by index
 * @param {function} fillRGBArray - callback(idx, r, g, b, a) used to paint a display buffer
 * @param {function} [allocateDisplayBuffer] - optional callback(win), called once the
 *        real image size is known (after resize) and before pixels are classified.
 *        Use this to size a display buffer before fillRGBArray starts writing into it.
 * @returns {Promise<{ matJS: object, countStar: number }>}
 *        matJS - the thresholded image as a JS-usable OpenCV value (used for debug preview)
 *        countStar - number of star pixels found
 */
export async function runSegmentation(imageSrc, win, segmentData, starData, fillRGBArray, allocateDisplayBuffer) {
  console.log(">>>> in function: runSegmentation");

  // 1) Load
  console.log("----1) base64ToMat");
  const base64 = await fetchImageAsBase64(imageSrc);
  if (!base64) throw new Error("src base64 string not ready yet");
  const srcMat = OpenCV.base64ToMat(base64);

  // 2) Resize to 1/3
  console.log("----2) resize: factor 1/3");
  const resizeMat = await resizeImage(srcMat, win);
  console.log("resizeMat", win);

  // Now that we know the actual image dimensions, let the caller allocate its display buffer
  if (allocateDisplayBuffer) allocateDisplayBuffer(win);

  // 3) Grayscale + threshold
  console.log("----3) grayscaling + thresholding...");
  const threshMat = await applyThreshold(resizeMat);
  const matJS = OpenCV.toJSValue(threshMat);

  // 4) Connected components + 5) classify
  let countStar = 0;
  console.log("----4) ConnectedComponents...");
  try {
    const { labelArray, statsArray, numSegment } = await runConnectedComponents(threshMat);
    console.log("numSegment", numSegment);

    const topLabels = getTopSegmentLabels(statsArray, numSegment, 10);
    console.log("top segment labels:", topLabels);

    console.log("----5) classifying pixels...");
    countStar = classifyPixels(win, labelArray, statsArray, topLabels, segmentData, starData, fillRGBArray);
    console.log("FINAL: Counted stars #", countStar);
  } catch (error) {
    console.error('Error in runSegmentation:', error);
  }

  OpenCV.clearBuffers();
  console.log(">>>> Segmentation completed successfully");

  return { matJS, countStar };
}