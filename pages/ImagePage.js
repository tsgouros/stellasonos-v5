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


// Define throttle time to limit how often audio can change during movement
const AUDIO_THROTTLE_MS = 100; // Only allow sound change every 100ms


export default function ImagePage({ route, navigation }) {
const { image } = route.params;
const superImageRef = useRef(null);
const isMountedRef = useRef(true);


// Ref to manage the audio throttling timer (NEW)
const throttleTimerRef = useRef(null);




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
  if (!superImageRef.current) return { x: 0, y: 0 };
   // We need to use the original image dimensions for the conversion ratios
  const imgW = superImageRef.current.win.imgWidth;
  const imgH = superImageRef.current.win.imgHeight;


  if (rotate) {
    // FIX: Correct 90-degree clockwise rotation mapping.
    // Display X -> Image Y. Display Y -> Inverted Image X.


    // Normalized coordinates on the screen display area
    const normalizedX = displayX / displayWidth;
    const normalizedY = displayY / displayHeight;


    // The new X (column) in the un-rotated image is derived from the normalized screen Y,
    // but inverted relative to the image's height.
    const imgX = Math.floor((1 - normalizedY) * imgW);
   
    // The new Y (row) in the un-rotated image is derived from the normalized screen X.
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




async function updateCursor(absoluteX, absoluteY) {
  if (!superImageRef.current || !imageSize || !isSegmented) return;




  setCursorCoords({ x: absoluteX, y: absoluteY });




  // Calculate padding to get coordinates relative to the image bounds
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
    // Convert display coordinates to image pixel coordinates
    ({ x: imgX, y: imgY } = displayToImageCoords(
      displayX,
      displayY,
      imageSize.width,
      imageSize.height,
      shouldRotate
    ));


    // Get segment number and information using IMAGE PIXEL coordinates
    if (superImageRef.current.segmentData) {
      const idx = (imgY * superImageRef.current.win.imgWidth + imgX);
      segmentToPlay = superImageRef.current.segmentData[idx];
      setSegmentNumber(segmentToPlay);
    
      // Get complete segment information
      const info = superImageRef.current.getSegmentInfo(segmentToPlay);
      setSegmentInfo(info);
    }
  } else {
    segmentToPlay = -1;
    // Get info for outside segment
    const info = superImageRef.current.getSegmentInfo("-1");
    setSegmentInfo(info);
    setSegmentNumber(-1);
  }


  if (throttleTimerRef.current) {
      return; // Skip the play call if the throttle timer is running
  }


  // Set a new timer to call play after the throttle period
  throttleTimerRef.current = setTimeout(() => {
      throttleTimerRef.current = null; // Clear timer after execution


      if (segmentToPlay !== null) {
          // Play sound using the coordinates/keys determined above
          if (segmentToPlay === -1) {
              // Play the outside segment (-1)
              superImageRef.current.play(-1, -1);
          } else {
              // Calculate normalized play coordinates for SuperImage.play()
              const playX = (imgX / superImageRef.current.win.imgWidth) * superImageRef.current.win.winWidth;
              const playY = (imgY / superImageRef.current.win.imgHeight) * superImageRef.current.win.winHeight;
              superImageRef.current.play(playX, playY);
          }
      }
  }, AUDIO_THROTTLE_MS);


}




function handleTouch(event) {
  const now = Date.now();
  if (now - lastTap < 500) {
    superImageRef.current?.stopSound();
    navigation.goBack();
    return;
  }
  setLastTap(now);




  const { pageX, pageY } = event.nativeEvent;
  updateCursor(pageX, pageY);
}




useEffect(() => {
  isMountedRef.current = true;
   // Import and initialize SuperImage asynchronously
  const initializeSuperImage = async () => {
    try {
      // Assuming the SuperImage class is correctly exported from this path
      // NOTE: You must ensure this path is correct in your project
      const SuperImageModule = await import('../utils/SuperImageTEMP.js');
      superImageRef.current = new SuperImageModule.default(image);
    
      // Setup image after SuperImage is initialized
      const uri = superImageRef.current.currentImage().src;
    
      Image.getSize(
        uri,
        async (width, height) => {
          if (!isMountedRef.current) return;




          const aspectRatio = width / height;
          // Determine rotation based on aspect ratio
          const rotate = aspectRatio > 1.3;
          const finalSize = rotate
            ? getFitSize(height, width, screenWidth * 0.95, screenHeight * 0.95)
            : getFitSize(width, height, screenWidth * 0.95, screenHeight * 0.95);




          setShouldRotate(rotate);
          setImageSize(finalSize);




          await superImageRef.current.performSegmentation({ width, height });
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
    superImageRef.current?.stopSound();
  });




  return () => {
    isMountedRef.current = false;
    unsubscribe();
    superImageRef.current?.stopSound();
    superImageRef.current?.destroy();
    // FINAL CLEANUP: Clear the throttle timer
    clearTimeout(throttleTimerRef.current);
  };
}, [image, navigation, screenWidth, screenHeight]);


// NEW EFFECT: Set initial segment info after segmentation is complete
useEffect(() => {
  if (isSegmented && superImageRef.current) {
    // Get info for the outside segment (-1)
    const info = superImageRef.current.getSegmentInfo("-1");
    setSegmentInfo(info);
    setSegmentNumber(-1);
    // Play the outside segment sound on initial load
    superImageRef.current.play(-1, -1);
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
        superImageRef.current?.stopSound();
        navigation.navigate("Home");
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
        const { pageX, pageY } = event.nativeEvent;
        updateCursor(pageX, pageY);
      }}
      onResponderRelease={handleTouch}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Image
          style={{
            // If rotated, swap width/height for the display container
            width: shouldRotate ? imageSize.height : imageSize.width,
            height: shouldRotate ? imageSize.width : imageSize.height,
            // Apply 90-degree clockwise rotation for display
            transform: shouldRotate ? [{ rotate: "90deg" }] : [],
          }}
          source={{ uri: superImageRef.current?.currentImage().src }}
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
          <Text style={styles.infoText}>
            Segment: {segmentNumber !== null ? segmentNumber : "-"}
            {segmentNumber === -1 && " (Outside image)"}
          </Text>
        
          {/* Display segment information */}
          {segmentInfo && (
            <>
              <View style={{height: 1, backgroundColor: 'white', marginVertical: 4}} />
              <Text style={styles.infoText}>Sound: {segmentInfo.sound}</Text>
              <Text style={styles.infoText}>Haptic: {segmentInfo.haptic ? segmentInfo.haptic.type : 'None'}</Text>
              <Text style={styles.infoText}>
                Auto-loop: {segmentInfo.switchPlayer ? 'Yes' : 'No'}
              </Text>
              <Text style={styles.infoText}>
                Touches: {segmentInfo.count || 0}
              </Text>
            </>
          )}
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
  minWidth: 200,
},
infoText: {
  color: "white",
  fontSize: 14,
  marginVertical: 2,
},
loadingText: {
  marginTop: 10,
  color: "#333",
},
});



