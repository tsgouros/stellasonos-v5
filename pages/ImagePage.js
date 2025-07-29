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

  function screenToImageCoords(screenX, screenY, screenWidth, screenHeight, imageWidth, imageHeight) {
    const imageX = Math.floor(Math.max(0, Math.min(imageWidth - 1, (screenX / screenWidth) * imageWidth)));
    const imageY = Math.floor(Math.max(0, Math.min(imageHeight - 1, (screenY / screenHeight) * imageHeight)));
    return { x: imageX, y: imageY };
  }

  function formatImage(relativeX, relativeY) {
    const imgW = superImage.win.imgWidth;
    const imgH = superImage.win.imgHeight;
    const displayW = imageSize.width;
    const displayH = imageSize.height;

    let screenX, screenY;
    if (shouldRotate) {
      screenX = relativeY;
      screenY = displayW - relativeX;
      return screenToImageCoords(screenX, screenY, displayH, displayW, imgW, imgH);
    } else {
      return screenToImageCoords(relativeX, relativeY, displayW, displayH, imgW, imgH);
    }
  }

  async function updateCursor(relativeX, relativeY, absoluteX, absoluteY) {
    setCursorCoords({ x: absoluteX, y: absoluteY });

    try {
      const color = await superImage.getColorAt(
        relativeX,
        relativeY,
        imageSize.width,
        imageSize.height,
        shouldRotate
      );
      setCursorColorHex(color);

      const { x: imgX, y: imgY } = formatImage(relativeX, relativeY);
      const idx = imgY * superImage.win.imgWidth + imgX;
      const segment = superImage.segmentData[idx];
      setSegmentNumber(segment);
      superImage.play(imgX, imgY);
    } catch (err) {
      console.warn("Failed to get color at:", err);
      setCursorColorHex("#ffffff");
      setSegmentNumber(null);
    }
  }

  function handleTouch(event) {
    const now = Date.now();
    if (now - lastTap < 500) {
      navigation.goBack();
      return;
    }
    setLastTap(now);

    const { locationX, locationY, pageX, pageY } = event.nativeEvent;
    updateCursor(locationX, locationY, pageX, pageY);
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
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate("Home")}
      >
        <Text style={styles.backButtonText}>← Back to Home</Text>
      </TouchableOpacity>

      <Pressable
        onPressIn={handleTouch}
        onPressOut={() => superImage.stopSound()}
        onTouchMove={(event) => {
          const { locationX, locationY, pageX, pageY } = event.nativeEvent;
          updateCursor(locationX, locationY, pageX, pageY);
        }}
        style={{
          width: imageSize.width,
          height: imageSize.height,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Image
          style={{
            width: shouldRotate ? imageSize.height : imageSize.width,
            height: shouldRotate ? imageSize.width : imageSize.height,
            transform: shouldRotate ? [{ rotate: "90deg" }] : [],
          }}
          source={{ uri: superImage.currentImage().src }}
          resizeMode="contain"
        />
      </Pressable>

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

      {cursorCoords.x !== null && cursorCoords.y !== null && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Coords: {cursorCoords.x.toFixed(0)}, {cursorCoords.y.toFixed(0)}
          </Text>
          <Text style={styles.infoText}>Color: {cursorColorHex}</Text>
          <Text style={styles.infoText}>
            Segment: {segmentNumber !== null ? segmentNumber : "-"}
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
    top: 50,
    left: 20,
    backgroundColor: "#333",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    zIndex: 10,
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
  },
  infoBox: {
    position: "absolute",
    top: 110,
    left: 20,
    backgroundColor: "#00000088",
    padding: 8,
    borderRadius: 6,
  },
  infoText: {
    color: "white",
    fontSize: 14,
  },
});
