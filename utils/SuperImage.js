import { OpenCV } from 'react-native-fast-opencv';
import { ObjectType } from 'react-native-fast-opencv';


// utils/SuperImage.js
export default class SuperImage {
  constructor(complexImage, name = "") {
    console.log("initializing SuperImage (bare-bones)");
    this.masterSrc = complexImage.src;
    this.title = complexImage.title;
    this.id = complexImage.id;
    this.layers = { 0: { src: complexImage.src } };
    this.currentImageKey = 0;

    // Initially empty until segmentation is performed
    this.segmentData = [];
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
    const idx = pos.y * this.win.imgWidth + pos.x;
    const segment = this.segmentData[idx];
    console.log(`Playing segment ${segment} at pixel (${pos.x}, ${pos.y})`);
    // Could trigger sound or haptics here
  }

  stopSound() {
    console.log(">>> SuperImage.stopSound(): Sound stopped");
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

    for (let y = 0; y < imgHeight; y++) {
      for (let x = 0; x < imgWidth; x++) {
        let segment;
        const halfWidth = imgWidth / 2;
        const halfHeight = imgHeight / 2;

        if (x < halfWidth && y < halfHeight) segment = 0; // top-left
        else if (x >= halfWidth && y < halfHeight) segment = 1; // top-right
        else if (x < halfWidth && y >= halfHeight) segment = 2; // bottom-left
        else segment = 3; // bottom-right

        this.segmentData[y * imgWidth + x] = segment;
      }
    }

    console.log(
      `>>> SuperImage.performSegmentation(): Quad segmentation with size ${size} created`
    );
  }
}
