import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Text,
  Dimensions,
  ActivityIndicator,
  Pressable,
  Platform
} from "react-native";
import SuperImage from "../utils/SuperImage.js";

export default function ImagePage({ route, navigation }) {
  const { image } = route.params;
  const superImage = useRef(new SuperImage(image)).current;

  const [cursorCoords, setCursorCoords] = useState({ x: null, y: null });
  const [cursorColorHex, setCursorColorHex] = useState("#ffffff");
  const [segmentNumber, setSegmentNumber] = useState(null);
  const [lastTap, setLastTap] = useState(0);

  const [imageSize, setImageSize] = useState(null);
  const [shouldRotate, setShouldRotate] = useState(false);

  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;

  // Platform-specific back button position
  const backButtonTop = Platform.select({
    ios: 80,  // Lower position for iOS (especially for island devices)
    android: 50 // Original position for Android
  });

  // 1. Pure screen to image coordinate conversion
  function screenToImageCoords(screenX, screenY, screenWidth, screenHeight, imageWidth, imageHeight) {
    const imageX = (screenX / screenWidth) * imageWidth;
    const imageY = (screenY / screenHeight) * imageHeight;
    return { x: imageX, y: imageY };
  }

  // 2. Pure image to screen coordinate conversion
  function imageToScreenCoords(imageX, imageY, imageWidth, imageHeight, screenWidth, screenHeight) {
    const screenX = (imageX / imageWidth) * screenWidth;
    const screenY = (imageY / imageHeight) * screenHeight;
    return { x: screenX, y: screenY };
  }

  // 3. Process coordinates with optional rotation
  function processCoordinatesWithRotation(inputX, inputY, screenWidth, screenHeight, imageWidth, imageHeight, shouldRotate) {
    // Step 1: Handle rotation if needed
    let screenX = inputX;
    let screenY = inputY;
    let displayWidth = screenWidth;
    let displayHeight = screenHeight;
    
    if (shouldRotate) {
      // Rotate coordinates 90 degrees clockwise
      screenX = inputY;
      screenY = screenWidth - inputX;
      displayWidth = screenHeight;
      displayHeight = screenWidth;
    }

    // Step 2: Convert to image coordinates
    const imageCoords = screenToImageCoords(
      screenX,
      screenY,
      displayWidth,
      displayHeight,
      imageWidth,
      imageHeight
    );

    // Step 3: Clamp to image bounds and floor to integers
    const clampedX = Math.max(0, Math.min(imageWidth - 1, Math.floor(imageCoords.x)));
    const clampedY = Math.max(0, Math.min(imageHeight - 1, Math.floor(imageCoords.y)));

    console.log(`Coordinate transformation:
      Screen: (${inputX}, ${inputY})
      ${shouldRotate ? `Rotated: (${screenX}, ${screenY})` : ''}
      Image: (${clampedX}, ${clampedY})`);

    return { x: clampedX, y: clampedY };
  }

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
  }, []);

  function getFitSize(imgW, imgH, maxW, maxH) {
    const imgRatio = imgW / imgH;
    const maxRatio = maxW / maxH;
    if (imgRatio > maxRatio) {
      return { width: maxW, height: maxW / imgRatio };
    } else {
      return { width: maxH * imgRatio, height: maxH };
    }
  }

  async function updateCursor(absoluteX, absoluteY) {
    setCursorCoords({ x: absoluteX, y: absoluteY });

    try {
      // Calculate image position (centered)
      const imageLeft = (screenWidth - imageSize.width) / 2;
      const imageTop = (screenHeight - imageSize.height) / 2;
      
      // Calculate relative coordinates within image
      const relativeX = absoluteX - imageLeft;
      const relativeY = absoluteY - imageTop;

      // Check if touch is within image bounds
      const isWithinImage = 
        relativeX >= 0 && relativeX <= imageSize.width &&
        relativeY >= 0 && relativeY <= imageSize.height;

      if (isWithinImage) {
        const color = await superImage.getColorAt(
          relativeX,
          relativeY,
          imageSize.width,
          imageSize.height
        );
        setCursorColorHex(color);

        const { x: imgX, y: imgY } = processCoordinatesWithRotation(
          relativeX,
          relativeY,
          imageSize.width,
          imageSize.height,
          superImage.win.imgWidth,
          superImage.win.imgHeight,
          shouldRotate
        );
        
        const idx = imgY * superImage.win.imgWidth + imgX;
        const segment = superImage.segmentData[idx];
        setSegmentNumber(segment);
        superImage.play(imgX, imgY);
      } else {
        setCursorColorHex("#ffffff");
        setSegmentNumber(-1);
      }
    } catch (err) {
      console.warn("Failed to get color at:", err);
      setCursorColorHex("#ffffff");
      setSegmentNumber(-1);
    }
  }

  function handleTouch(event) {
    const now = Date.now();
    if (now - lastTap < 500) {
      navigation.goBack();
      return;
    }
    setLastTap(now);

    const { pageX, pageY } = event.nativeEvent;
    updateCursor(pageX, pageY);
  }

  if (!imageSize) {
    return (
      <View style={styles.imageContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.imageContainer}>
      {/* Back button with higher zIndex to ensure it stays clickable */}
      <TouchableOpacity
        style={[styles.backButton, { top: backButtonTop }]}
        onPress={() => navigation.navigate("Home")}
        hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
      >
        <Text style={styles.backButtonText}>← Back to Home</Text>
      </TouchableOpacity>

      {/* Main touch area */}
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
        {/* Image container */}
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center'
        }}>
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

      {/* Cursor indicator */}
      {cursorCoords.x !== null && cursorCoords.y !== null && (
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
      )}

      {/* Info box */}
      {cursorCoords.x !== null && cursorCoords.y !== null && (
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