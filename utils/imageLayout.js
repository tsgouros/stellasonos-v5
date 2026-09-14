// ─────────────────────────────────────────────────────────────────────────
// imageLayout.js
//
// Pure math helpers for mapping between "where on screen was the touch"
// and "where in the image is that" — no React, no state, nothing async.
// If the layout/rotation logic ever needs to change, this is the only
// file that should need editing.
// ─────────────────────────────────────────────────────────────────────────

/**
 * displayToImageCoords
 * Converts a touch position on the *displayed* (possibly rotated) image
 * into a pixel coordinate on the *underlying* image data.
 *
 * @param {number} displayX - touch x, relative to the displayed image's top-left
 * @param {number} displayY - touch y, relative to the displayed image's top-left
 * @param {number} displayWidth - width of the displayed image on screen
 * @param {number} displayHeight - height of the displayed image on screen
 * @param {boolean} rotate - true if the image is being shown rotated 270°
 *        (used for wide images that are rotated to fit a portrait screen)
 * @param {number} imgW - width of the underlying (unrotated) image data
 * @param {number} imgH - height of the underlying (unrotated) image data
 * @returns {{x: number, y: number}} pixel coordinate in the underlying image,
 *        clamped to [0, imgW-1] / [0, imgH-1]
 */
export function displayToImageCoords(displayX, displayY, displayWidth, displayHeight, rotate, imgW, imgH) {
  if (rotate) {
    const normalizedX = displayX / displayWidth;
    const normalizedY = displayY / displayHeight;
    const imgX = Math.floor((1 - normalizedY) * imgW);
    const imgY = Math.floor(normalizedX * imgH);
    return {
      x: Math.max(0, Math.min(imgW - 1, imgX)),
      y: Math.max(0, Math.min(imgH - 1, imgY)),
    };
  } else {
    const imgX = Math.floor((displayX / displayWidth) * imgW);
    const imgY = Math.floor((displayY / displayHeight) * imgH);
    return {
      x: Math.max(0, Math.min(imgW - 1, imgX)),
      y: Math.max(0, Math.min(imgH - 1, imgY)),
    };
  }
}

/**
 * getFitSize
 * Given an image's natural size and a maximum box to fit it in, returns
 * the largest size that fits inside the box while keeping the image's
 * aspect ratio ("contain" behavior, computed manually).
 *
 * @param {number} imgW - image's natural width
 * @param {number} imgH - image's natural height
 * @param {number} maxW - width of the box to fit inside
 * @param {number} maxH - height of the box to fit inside
 * @returns {{width: number, height: number}}
 */
export function getFitSize(imgW, imgH, maxW, maxH) {
  const imgRatio = imgW / imgH;
  const maxRatio = maxW / maxH;
  return imgRatio > maxRatio
    ? { width: maxW, height: maxW / imgRatio }
    : { width: maxH * imgRatio, height: maxH };
}