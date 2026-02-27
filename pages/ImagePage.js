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

// How often we allow the sound to change while the finger is moving.
// Without this, dragging slowly would fire dozens of play() calls per second.
const AUDIO_THROTTLE_MS = 100;

export default function ImagePage({ route, navigation }) {
 const { image } = route.params;
 const superImageRef = useRef(new SuperImage(image)).current;
 
 const isMountedRef = useRef(true);

 // Keeps track of the throttle timeout so we can cancel it on unmount
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

 // Converts a touch position on screen into the corresponding pixel coordinate
 // in the unscaled, unrotated image that OpenCV segmented.
 function displayToImageCoords(displayX, displayY, displayWidth, displayHeight, rotate) {
   if (!superImageRef.current) return { x: 0, y: 0 };
  
   const imgW = superImageRef.current.win.imgWidth;
   const imgH = superImageRef.current.win.imgHeight;

   if (rotate) {
     // The image is displayed rotated 90° clockwise, so we have to undo that
     // to find the right pixel in the original unrotated segmentation data.
     // Screen X maps to image Y, and screen Y maps to inverted image X.
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

 // Returns the display dimensions that fit the image inside maxW/maxH while keeping aspect ratio
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

   // The image is centered, so subtract the offset to get coordinates relative to the image
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
       displayX,
       displayY,
       imageSize.width,
       imageSize.height,
       shouldRotate
     ));

     if (superImageRef.current.segmentData) {
       const idx = (imgY * superImageRef.current.win.imgWidth + imgX);
       segmentToPlay = superImageRef.current.segmentData[idx];
       setSegmentNumber(segmentToPlay);
       const info = superImageRef.current.getSegmentInfo(segmentToPlay);
       setSegmentInfo(info);
     }
   } else {
     // Finger is outside the image — use the special -1 segment
     segmentToPlay = -1;
     const info = superImageRef.current.getSegmentInfo("-1"); 
     setSegmentInfo(info);
     setSegmentNumber(-1);
   }

   // If the throttle timer is still running, skip this play call.
   // We'll catch the next one once the timer clears.
   if (throttleTimerRef.current) {
       return;
   }

   throttleTimerRef.current = setTimeout(() => {
       throttleTimerRef.current = null;

       if (segmentToPlay !== null) {
           if (segmentToPlay === -1) {
               superImageRef.current.play(-1, -1);
           } else {
               // SuperImage.play() expects screen-scale coordinates, so scale back up
               const playX = (imgX / superImageRef.current.win.imgWidth) * superImageRef.current.win.winWidth;
               const playY = (imgY / superImageRef.current.win.imgHeight) * superImageRef.current.win.winHeight;
               superImageRef.current.play(playX, playY);
           }
       }
   }, AUDIO_THROTTLE_MS);
 }

 function handleTouch(event) {
   const now = Date.now();
   // Double-tap to go back
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
  
   const initializeSuperImage = async () => {
     try {
       const SuperImageModule = await import('../utils/SuperImage.js');
       superImageRef.current = new SuperImageModule.default(image);
      
       const uri = superImageRef.current.currentImage().src;
      
       Image.getSize(
         uri,
         async (width, height) => {
           if (!isMountedRef.current) return;

           const aspectRatio = width / height;
           // Wide images (aspect ratio > 1.3) get rotated to fill the screen better
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
     clearTimeout(throttleTimerRef.current); 
   };
 }, [image, navigation, screenWidth, screenHeight]);

 // Once segmentation is done, set the initial state to "outside image" and
 // wait for all audio players to finish loading before playing anything.
 useEffect(() => {
   if (isSegmented && superImageRef.current) {
     const info = superImageRef.current.getSegmentInfo("-1");
     setSegmentInfo(info);
     setSegmentNumber(-1);

     // setCompletionCallback fires once all players are prepared.
     // Playing before that causes "not prepared yet" warnings, so we wait.
     superImageRef.current.setCompletionCallback(() => {
        console.log("SuperImage: All players ready. Playing initial outside sound.");
        superImageRef.current.play(-1, -1);
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
         superImageRef.current?.stopSound();
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
         const { pageX, pageY } = event.nativeEvent;
         updateCursor(pageX, pageY);
       }}
       onResponderRelease={handleTouch}
     >
       <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
         <Image
           style={{
             // When rotated, swap width/height so the container matches the rotated dimensions
             width: shouldRotate ? imageSize.height : imageSize.width,
             height: shouldRotate ? imageSize.width : imageSize.height,
             transform: shouldRotate ? [{ rotate: "270deg" }] : [],
           }}
           source={{ uri: superImageRef.current?.currentImage().src }}
           resizeMode="contain"
           onLayout={(e) => {
             // Keep SuperImage's win dimensions in sync with the actual rendered size
             const { width, height } = e.nativeEvent.layout;
             superImageRef.current.win.winWidth = width;
             superImageRef.current.win.winHeight = height;
             console.log("this is height")
             console.log(superImageRef.current.win.winHeight)
             console.log("this is width")
             console.log(superImageRef.current.win.winWidth)
           }}
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