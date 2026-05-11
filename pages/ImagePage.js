import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Image,
  Text,
  Dimensions,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from "react-native";
import SuperImage from "../utils/SuperImage.js";

const AUDIO_THROTTLE_MS = 100;

export default function ImagePage({ route, navigation }) {
  const { image } = route.params;
  // NOTE: this gives us the SuperImage instance directly, not a ref wrapper
  const superImage = useRef(new SuperImage(image)).current;

  const isMountedRef = useRef(true);

  // --- RAF loop refs ---
  const touchRef = useRef({ x: null, y: null, dirty: false });
  const rafRef = useRef(null);
  const lastPlayTimeRef = useRef(0);

  const [cursorCoords, setCursorCoords] = useState({ x: null, y: null });
  const [segmentNumber, setSegmentNumber] = useState(null);
  const [segmentInfo, setSegmentInfo] = useState(null);
  const [lastTap, setLastTap] = useState(0);
  const [imageSize, setImageSize] = useState(null);
  const [shouldRotate, setShouldRotate] = useState(false);
  const [isSegmented, setIsSegmented] = useState(false);

  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;
  const backButtonTop = Platform.select({ ios: 80, android: 50 });

  function displayToImageCoords(displayX, displayY, displayWidth, displayHeight, rotate) {
    const imgW = superImage.win.imgWidth;
    const imgH = superImage.win.imgHeight;

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

  function getFitSize(imgW, imgH, maxW, maxH) {
    const imgRatio = imgW / imgH;
    const maxRatio = maxW / maxH;
    return imgRatio > maxRatio
      ? { width: maxW, height: maxW / imgRatio }
      : { width: maxH * imgRatio, height: maxH };
  }

  // ===========================================
  // RAF LOOP — does all the work per frame
  // ===========================================
  useEffect(() => {
    const loop = () => {
      const t = touchRef.current;

      if (t.dirty && superImage && imageSize && isSegmented) {
        t.dirty = false;

        const absoluteX = t.x;
        const absoluteY = t.y;

        setCursorCoords({ x: absoluteX, y: absoluteY });

        const imageLeft = (screenWidth - imageSize.width) / 2;
        const imageTop = (screenHeight - imageSize.height) / 2;
        const displayX = absoluteX - imageLeft;
        const displayY = absoluteY - imageTop;

        const isWithinImage =
          displayX >= 0 && displayX <= imageSize.width &&
          displayY >= 0 && displayY <= imageSize.height;

        let segmentToPlay = null;
        let imgX = -1;
        let imgY = -1;

        if (isWithinImage) {
          ({ x: imgX, y: imgY } = displayToImageCoords(
            displayX, displayY,
            imageSize.width, imageSize.height,
            shouldRotate
          ));

          if (superImage.segmentData) {
            const idx = imgY * superImage.win.imgWidth + imgX;
            segmentToPlay = superImage.segmentData[idx];
            setSegmentNumber(segmentToPlay);
            const info = superImage.getSegmentInfo(segmentToPlay);
            setSegmentInfo(info);
          }
        } else {
          segmentToPlay = -1;
          const info = superImage.getSegmentInfo("-1");
          setSegmentInfo(info);
          setSegmentNumber(-1);
        }

        // Throttle audio exactly like the original — skip play if too soon
        const now = Date.now();
        if (now - lastPlayTimeRef.current >= AUDIO_THROTTLE_MS) {
          lastPlayTimeRef.current = now;

          if (segmentToPlay !== null) {
            if (segmentToPlay === -1) {
              superImage.play(-1, -1);
            } else {
              const playX = (imgX / superImage.win.imgWidth) * superImage.win.winWidth;
              const playY = (imgY / superImage.win.imgHeight) * superImage.win.winHeight;
              superImage.play(playX, playY);
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isSegmented, imageSize, shouldRotate, screenWidth, screenHeight]);

  // TOUCH HANDLERS — minimal work
  function handleTouch(event) {
    const now = Date.now();
    if (now - lastTap < 500) {
      superImage.stopSound();
      navigation.goBack();
      return;
    }
    setLastTap(now);
    const { pageX, pageY } = event.nativeEvent;
    touchRef.current = { x: pageX, y: pageY, dirty: true };
  }

  //initialization   
  useEffect(() => {
    isMountedRef.current = true;

    const initializeSuperImage = async () => {
      try {
        const uri = superImage.currentImage().src;

        Image.getSize(
          uri,
          async (width, height) => {
            if (!isMountedRef.current) return;

            const aspectRatio = width / height;
            const rotate = aspectRatio > 1.3;
            const finalSize = rotate
              ? getFitSize(height, width, screenWidth * 0.95, screenHeight * 0.95)
              : getFitSize(width, height, screenWidth * 0.95, screenHeight * 0.95);

            setShouldRotate(rotate);
            setImageSize(finalSize);

            await superImage.performSegmentation({ width, height });
            setIsSegmented(true);
          },
          (error) => console.warn("Failed to load image dimensions", error)
        );
      } catch (error) {
        console.error("Error initializing SuperImage:", error);
      }
    };

    initializeSuperImage();

    const unsubscribe = navigation.addListener('beforeRemove', () => {
      superImage.stopSound();
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
      superImage.stopSound();
      superImage.destroy();
    };
  }, [image, navigation, screenWidth, screenHeight]);

  useEffect(() => {
    if (isSegmented && superImage) {
      const info = superImage.getSegmentInfo("-1");
      setSegmentInfo(info);
      setSegmentNumber(-1);

      superImage.setCompletionCallback(() => {
        console.log("SuperImage: All players ready. Playing initial outside sound.");
        superImage.play(-1, -1);
      });
    }
  }, [isSegmented]);

  if (!imageSize) {
    return (
      <View style={styles.imageContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading image and audio...</Text>
      </View>
    );
  }

  return (
    <View style={styles.imageContainer}>
      <TouchableOpacity
        style={[styles.backButton, { top: backButtonTop }]}
        onPress={() => {
          superImage.stopSound();
          navigation.goBack();
        }}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <Text style={styles.backButtonText}>← Back to Home</Text>
      </TouchableOpacity>

      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderMove={(event) => {
          // THIS IS THE INTERRUPT HANDLER — just stash coords
          touchRef.current = {
            x: event.nativeEvent.pageX,
            y: event.nativeEvent.pageY,
            dirty: true,
          };
        }}
        onResponderRelease={handleTouch}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Image
            style={{
              width: shouldRotate ? imageSize.height : imageSize.width,
              height: shouldRotate ? imageSize.width : imageSize.height,
              transform: shouldRotate ? [{ rotate: "270deg" }] : [],
            }}
            source={{ uri: superImage.currentImage().src }}
            resizeMode="contain"
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              superImage.win.winWidth = width;
              superImage.win.winHeight = height;
            }}
          />
        </View>
      </View>

      {cursorCoords.x !== null && cursorCoords.y !== null && (
        <>
          <View
            style={[
              { position: "absolute", left: cursorCoords.x - 20, top: cursorCoords.y - 20 },
              styles.circle,
            ]}
            pointerEvents="none"
          />
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Screen: {cursorCoords.x.toFixed(0)}, {cursorCoords.y.toFixed(0)}
            </Text>
            <Text style={styles.infoText}>
              Segment: {segmentNumber !== null ? segmentNumber : "-"}
              {segmentNumber === -1 && " (Outside image)"}
            </Text>
            {segmentInfo && (
              <>
                <View style={{height: 1, backgroundColor: 'white', marginVertical: 4}} />
                <Text style={styles.infoText}>Sound: {segmentInfo.sound}</Text>
                <Text style={styles.infoText}>Haptic: {segmentInfo.haptic ? segmentInfo.haptic.type : 'None'}</Text>
                <Text style={styles.infoText}>Auto-loop: {segmentInfo.switchPlayer ? 'Yes' : 'No'}</Text>
                <Text style={styles.infoText}>Touches: {segmentInfo.count || 0}</Text>
              </>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: { flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" },
  backButton: { position: "absolute", left: 20, backgroundColor: "#333", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, zIndex: 100 },
  backButtonText: { color: "#fff", fontSize: 16 },
  circle: { height: 40, width: 40, borderRadius: 20, borderWidth: 2, borderColor: "#00000020", backgroundColor: "rgba(0,150,255,0.7)", zIndex: 50 },
  infoBox: { position: "absolute", top: 110, left: 20, backgroundColor: "#00000088", padding: 8, borderRadius: 6, zIndex: 50, minWidth: 200 },
  infoText: { color: "white", fontSize: 14, marginVertical: 2 },
  loadingText: { marginTop: 10, color: "#333" },
});