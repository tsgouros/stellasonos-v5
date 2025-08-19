import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Text,
  Dimensions,
  ActivityIndicator,
  Platform
} from "react-native";
import SuperImage from "../utils/SuperImageTEMP.js";

export default function ImagePage({ route, navigation }) {
  const { image } = route.params;
  const superImage = useRef(new SuperImage(image)).current;

  // State variables
  const [cursorCoords, setCursorCoords] = useState({ x: null, y: null });
  const [cursorColorHex, setCursorColorHex] = useState("#ffffff");
  const [segmentNumber, setSegmentNumber] = useState(null);
  const [lastTap, setLastTap] = useState(0);
  const [imageSize, setImageSize] = useState(null);
  const [shouldRotate, setShouldRotate] = useState(false);

  // Screen dimensions
  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;

  // Back button position
  const backButtonTop = Platform.select({
    ios: 80,
    android: 50
  });

  // Convert display coordinates to image coordinates
  function displayToImageCoords(displayX, displayY, displayWidth, displayHeight, shouldRotate) {
    if (shouldRotate) {
      const normalizedX = displayX / displayWidth;
      const normalizedY = displayY / displayHeight;
      
      const imgX = Math.floor(normalizedY * superImage.win.imgWidth);
      const imgY = Math.floor((1 - normalizedX) * superImage.win.imgHeight);
      
      return {
        x: Math.max(0, Math.min(superImage.win.imgWidth - 1, imgX)),
        y: Math.max(0, Math.min(superImage.win.imgHeight - 1, imgY))
      };
    } else {
      const imgX = Math.floor((displayX / displayWidth) * superImage.win.imgWidth);
      const imgY = Math.floor((displayY / displayHeight) * superImage.win.imgHeight);
      
      return {
        x: Math.max(0, Math.min(superImage.win.imgWidth - 1, imgX)),
        y: Math.max(0, Math.min(superImage.win.imgHeight - 1, imgY))
      };
    }
  }

  // Calculate image display size
  function getFitSize(imgW, imgH, maxW, maxH) {
    const imgRatio = imgW / imgH;
    const maxRatio = maxW / maxH;
    return imgRatio > maxRatio
      ? { width: maxW, height: maxW / imgRatio }
      : { width: maxH * imgRatio, height: maxH };
  }

  // Handle cursor updates and audio playback
  async function updateCursor(absoluteX, absoluteY) {
    setCursorCoords({ x: absoluteX, y: absoluteY });

    try {
      const imageLeft = (screenWidth - imageSize.width) / 2;
      const imageTop = (screenHeight - imageSize.height) / 2;
      
      const relativeX = absoluteX - imageLeft;
      const relativeY = absoluteY - imageTop;

      const isWithinImage =
        relativeX >= 0 && relativeX <= imageSize.width &&
        relativeY >= 0 && relativeY <= imageSize.height;

      if (isWithinImage) {
        const { x: imgX, y: imgY } = displayToImageCoords(
          relativeX,
          relativeY,
          imageSize.width,
          imageSize.height,
          shouldRotate
        );

        // Get color and segment data
        const color = superImage.getColorAt(imgX, imgY);
        setCursorColorHex(color);

        const idx = imgY * superImage.win.imgWidth + imgX;
        const segment = superImage.segmentData[idx];
        setSegmentNumber(segment);

        // Play audio for this segment
        superImage.play(imgX, imgY);
      } else {
        setCursorColorHex("#ffffff");
        setSegmentNumber(-1);
        superImage.stopSound(); // Stop audio when outside image
      }
    } catch (err) {
      console.warn("Error in updateCursor:", err);
      setCursorColorHex("#ffffff");
      setSegmentNumber(-1);
    }
  }

  // Handle touch events
  function handleTouch(event) {
    const now = Date.now();
    if (now - lastTap < 500) {
      superImage.stopSound(); // Stop audio when navigating back
      navigation.goBack();
      return;
    }
    setLastTap(now);

    const { pageX, pageY } = event.nativeEvent;
    updateCursor(pageX, pageY);
  }

  // Initialize image and audio
  useEffect(() => {
    async function setup() {
      const imageData = { width: 10, height: 10 };
      await superImage.performSegmentation(imageData);

      const uri = superImage.currentImage().src;
      Image.getSize(
        uri,
        (width, height) => {
          const aspectRatio = width / height;
          const rotate = aspectRatio > 1.3;
          const finalSize = rotate
            ? getFitSize(height, width, screenWidth * 0.95, screenHeight * 0.95)
            : getFitSize(width, height, screenWidth * 0.95, screenHeight * 0.95);
          
          setShouldRotate(rotate);
          setImageSize(finalSize);
        },
        (error) => {
          console.warn("Failed to load image dimensions", error);
        }
      );
    }

    setup();

    // Cleanup audio when component unmounts
    return () => {
      superImage.stopSound();
    };
  }, []);

  if (!imageSize) {
    return (
      <View style={styles.imageContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.imageContainer}>
      <TouchableOpacity
        style={[styles.backButton, { top: backButtonTop }]}
        onPress={() => {
          superImage.stopSound();
          navigation.navigate("Home");
        }}
        hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
      >
        <Text style={styles.backButtonText}>← Back to Home</Text>
      </TouchableOpacity>

      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderMove={(event) => {
          const { pageX, pageY } = event.nativeEvent;
          updateCursor(pageX, pageY);
        }}
        onResponderRelease={handleTouch}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Image
            style={{
              width: shouldRotate ? imageSize.height : imageSize.width,
              height: shouldRotate ? imageSize.width : imageSize.height,
              transform: shouldRotate ? [{ rotate: "90deg" }] : [],
            }}
            source={{ uri: superImage.currentImage().src }}
            resizeMode="contain"
          />
        </View>
      </View>

      {cursorCoords.x !== null && cursorCoords.y !== null && (
        <>
          <View
            style={[
              {
                position: "absolute",
                left: cursorCoords.x - 20,
                top: cursorCoords.y - 20,
              },
              styles.circle,
            ]}
            pointerEvents="none"
          />
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Screen: {cursorCoords.x.toFixed(0)}, {cursorCoords.y.toFixed(0)}
            </Text>
            <Text style={styles.infoText}>Color: {cursorColorHex}</Text>
            <Text style={styles.infoText}>
              Segment: {segmentNumber !== null ? segmentNumber : "-"}
              {segmentNumber === -1 && " (Outside image)"}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    position: "absolute",
    left: 20,
    backgroundColor: "#333",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    zIndex: 100,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  circle: {
    height: 40,
    width: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#00000020",
    backgroundColor: "rgba(0,150,255,0.7)",
    zIndex: 50,
  },
  infoBox: {
    position: "absolute",
    top: 110,
    left: 20,
    backgroundColor: "#00000088",
    padding: 8,
    borderRadius: 6,
    zIndex: 50,
  },
  infoText: {
    color: "white",
    fontSize: 14,
  },
});
