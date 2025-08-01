// ImagePage.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Text,
  Dimensions,
} from "react-native";

import SuperImage from "../utils/SuperImage.js";

export default function TestSeg({ route, navigation }) {
  console.log("initializing TestSeg")
  
  const { image } = route.params;

  const superImage = useRef(new SuperImage(image)).current;

  const [cursorCoords, setCursorCoords] = useState({ x: null, y: null });
  const [cursorColorHex, setCursorColorHex] = useState("#ffffff");
  const [segmentNumber, setSegmentNumber] = useState(null);
  const [lastTap, setLastTap] = useState(0);

  const touchAreaWidth = Dimensions.get("window").width;
  const touchAreaHeight = Dimensions.get("window").height;
  

  // Call performSegmentation once on mount to set up segmentData
  useEffect(() => {
    async function setupSegmentation() {
      // const imageData = { width: 10, height: 10 };
      // check: should i just be the current image, then no param?
      await superImage.performSegmentation(superImage.currentImage);
    }
    console.log("at useEffect, performSegmentation")
    setupSegmentation();
  }, []);

  async function updateCursor(x, y) {
    setCursorCoords({ x, y });

    try {
      const color = await superImage.getColorAt(
        x,
        y,
        touchAreaWidth,
        touchAreaHeight
      );
      setCursorColorHex(color);

      // Calculate segment index at position
      console.log("at updateCursor, assigning imgWidth");
      const localX = Math.floor((x / touchAreaWidth) * superImage.win.imgWidth);
      const localY = Math.floor((y / touchAreaHeight) * superImage.win.imgHeight);
      const idx = localY * superImage.win.imgWidth + localX;
      console.log("after assignment");

      const segment = superImage.segmentData[idx];
      console.log("segment", segment);
      setSegmentNumber(segment);
    } catch (err) {
      console.warn("Failed to get color at:", err);
      setCursorColorHex("#ffffff");
      setSegmentNumber(null);
    }

    superImage.play(x, y);
  }

  function handleTouch(event) {
    const now = Date.now();
    if (now - lastTap < 500) {
      navigation.goBack();
      return;
    }
    setLastTap(now);

    const { locationX, locationY } = event.nativeEvent;
    updateCursor(locationX, locationY);
  }

  return (
    <View
      style={styles.imageContainer}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={handleTouch}
      onResponderMove={(event) => {
        const { locationX, locationY } = event.nativeEvent;
        updateCursor(locationX, locationY);
      }}
      onResponderRelease={() => {
        superImage.stopSound();
      }}
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate("Home")}
        accessibilityLabel="Back to Home"
        accessibilityHint="Navigates back to the home screen"
      >
        <Text style={styles.backButtonText}>← Back to Home</Text>
      </TouchableOpacity>

      <Image
        style={styles.image}
        source={{ uri: superImage.currentImage().src }}
      />

      <Image
        style={styles.image}
        source={{ uri: superImage.getMatImage() }}
      />

      {cursorCoords.x !== null && cursorCoords.y !== null && (
        <View
          style={[
            styles.circle,
            {
              position: "absolute",
              left: cursorCoords.x - 20,
              top: cursorCoords.y - 20,
            },
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
    margin: 0,
    padding: 0,
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
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
  image: {
    flex: 1,
    resizeMode: "contain",
    width: Dimensions.get("window").width,
  },
  circle: {
    height: 40,
    width: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#00000020",
    backgroundColor: "rgba(0,150,255,0.7)", // fixed blue circle
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