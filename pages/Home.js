import React, { useState, useRef } from "react";
import {
  Platform,
  StatusBar,
  Image,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  TextInput,
  Keyboard,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  FlatList,
} from "react-native";

import {
  GestureHandlerRootView,
  PanGestureHandler,
} from "react-native-gesture-handler";

const { width, height } = Dimensions.get("window");
import images from "../images.json";

export default function Home({ navigation }) {
  const [searchText, setSearchText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputIndex, setInputIndex] = useState("1");
  const [showDropdown, setShowDropdown] = useState(false);

  const panRef = useRef();

  const filteredImages =
    searchText.length > 0
      ? images.images.filter((img) =>
          img.title.toLowerCase().startsWith(searchText.toLowerCase())
        )
      : [];

  const maxIndex = images.images.length - 1;

  const onSearchChange = (text) => {
    setSearchText(text);
    setShowDropdown(text.length > 0);
  };

  const onSelectImage = (index) => {
    setCurrentIndex(index);
    setInputIndex((index + 1).toString());
    setSearchText("");
    setShowDropdown(false);
    Keyboard.dismiss();
  };

  const handleInputChange = (text) => setInputIndex(text);

  const handleSubmit = () => {
    const newIndex = parseInt(inputIndex) - 1;
    if (!isNaN(newIndex) && newIndex >= 0 && newIndex <= maxIndex) {
      setCurrentIndex(newIndex);
    } else {
      setInputIndex((currentIndex + 1).toString());
    }
    Keyboard.dismiss();
  };

  const handleNext = () => {
    if (currentIndex < maxIndex) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setInputIndex((newIndex + 1).toString());
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setInputIndex((newIndex + 1).toString());
    }
  };

  const navigateToImagePage = (image) => {
    navigation.navigate("TestSeg", { image });
    console.log("Navigating to Image page with image: " + image.title);
  };

  const goBack = () => navigation.goBack();

  const onPanGestureEvent = (event) => {
    const { translationX, state } = event.nativeEvent;

    if (event.nativeEvent.state === 5) {
      // Gesture end
      if (translationX < -50 && currentIndex < maxIndex) {
        // swipe left
        handleNext();
      } else if (translationX > 50 && currentIndex > 0) {
        // swipe right
        handlePrevious();
      }
    }
  };

  const dynamicStyles = {
    container: {
      flex: 1,
      backgroundColor: "#f5f5f5",
    },
    searchContainer: {
      width: "100%",
      backgroundColor: "#fff",
      paddingHorizontal: 10,
      paddingBottom: 5,
      borderBottomWidth: 1,
      borderBottomColor: "#ccc",
      zIndex: 20,
      ...Platform.select({
        android: {
          marginTop: 20, // margin only on Android
        },
      }),
    },
    searchInput: {
      width: "100%",
      height: 40,
      fontSize: 18,
      borderWidth: 1,
      borderColor: "#ccc",
      borderRadius: 6,
      paddingHorizontal: 10,
      color: "#000",
    },
    dropdown: {
      maxHeight: 150,
      borderWidth: 1,
      borderColor: "#ccc",
      borderRadius: 6,
      backgroundColor: "#fff",
      marginTop: 5,
      zIndex: 20,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    dropdownItem: {
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderBottomWidth: 1,
      borderBottomColor: "#eee",
    },
    dropdownItemText: {
      fontSize: 16,
      color: "#333",
    },
    noResultsText: {
      padding: 10,
      fontStyle: "italic",
      color: "#999",
    },
    contentContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingTop: 20,
    },
    backButton: {
      position: "absolute",
      bottom: 40,
      left: 10,
      padding: 10,
      zIndex: 10,
      backgroundColor: "#eee",
      borderRadius: 6,
    },
    imageContainer: {
      borderRadius: 8,
      backgroundColor: "#f5f5f5",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 6,
        },
        android: {
          elevation: 6,
        },
      }),
      overflow: "hidden",
    },
    image: {
      width: width * 0.9,
      height: height * 0.3,
      resizeMode: "contain",
      borderRadius: 8,
      backgroundColor: "transparent", // prevents white box on Android
    },
    text: {
      marginBottom: 20,
      marginTop: 10,
      fontSize: 24,
      fontWeight: "bold",
      textAlign: "center",
    },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      marginTop: 25,
      gap: 15,
    },
    navButton: {
      backgroundColor: "#007AFF",
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
    },
    disabledButton: {
      backgroundColor: "#ccc",
    },
    navButtonText: {
      color: "#fff",
      fontWeight: "600",
      fontSize: 16,
      textAlign: "center",
    },
    input: {
      width: 60,
      height: 44,
      fontSize: 18,
      textAlign: "center",
      color: "#000",
      borderWidth: 1,
      borderColor: "#ccc",
      borderRadius: 6,
      ...Platform.select({
        android: { paddingVertical: 8 },
        ios: { paddingVertical: 6 },
      }),
    },
    tapImageText: {
      marginTop: 15,
      fontSize: 16,
      color: "#666",
      textAlign: "center",
      fontStyle: "italic",
    },
    thumbnailList: {
      marginTop: 20,
      maxHeight: 80,
    },
    thumbnailItem: {
      width: 70,
      height: 70,
      marginRight: 10,
      borderRadius: 6,
      borderWidth: 2,
    },
    thumbnailSelected: {
      borderColor: "#007AFF",
    },
    thumbnailUnselected: {
      borderColor: "transparent",
    },
  };

  const currentImage = images.images[currentIndex];

  const renderThumbnail = ({ item, index }) => (
    <TouchableOpacity
      onPress={() => onSelectImage(index)}
      accessibilityLabel={`Thumbnail for image titled ${item.title}`}
      accessibilityHint={`Selects image ${index + 1} of ${maxIndex + 1}`}
      style={[
        dynamicStyles.thumbnailItem,
        index === currentIndex
          ? dynamicStyles.thumbnailSelected
          : dynamicStyles.thumbnailUnselected,
      ]}
    >
      <Image
        source={{ uri: item.src }}
        style={{ width: 70, height: 70, borderRadius: 6 }}
      />
    </TouchableOpacity>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={dynamicStyles.container}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
          >
            <View style={dynamicStyles.searchContainer}>
              <TextInput
                placeholder="Search images by title..."
                style={dynamicStyles.searchInput}
                value={searchText}
                onChangeText={onSearchChange}
                accessibilityLabel="Search images by title"
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
              {showDropdown && filteredImages.length > 0 && (
                <ScrollView
                  style={dynamicStyles.dropdown}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  contentContainerStyle={{ paddingVertical: 5 }}
                  showsVerticalScrollIndicator={true}
                >
                  {filteredImages.map((img) => {
                    const idx = images.images.indexOf(img);
                    return (
                      <TouchableOpacity
                        key={img.id || idx}
                        onPress={() => onSelectImage(idx)}
                        style={dynamicStyles.dropdownItem}
                        accessibilityLabel={`Select image titled ${img.title}`}
                      >
                        <Text style={dynamicStyles.dropdownItemText}>
                          {img.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
              {showDropdown && filteredImages.length === 0 && (
                <Text style={dynamicStyles.noResultsText}>No images found</Text>
              )}
            </View>

            <TouchableOpacity
              style={dynamicStyles.backButton}
              onPress={goBack}
              accessibilityLabel="Back"
              accessibilityHint="Button"
              accessible={true}
            >
              <Text>Back</Text>
            </TouchableOpacity>

            <View style={dynamicStyles.contentContainer}>
              {currentImage ? (
                <>
                  <Text style={dynamicStyles.text}>{currentImage.title}</Text>

                  <PanGestureHandler
                    ref={panRef}
                    onEnded={onPanGestureEvent}
                    activeOffsetX={[-10, 10]}
                    failOffsetY={[-10, 10]}
                  >
                    <View style={dynamicStyles.imageContainer}>
                      <TouchableOpacity
                        onPress={() => navigateToImagePage(currentImage)}
                        accessibilityLabel={`${currentImage.description}. Double tap to play details.`}
                        accessible={true}
                        activeOpacity={0.85}
                      >
                        <Image
                          style={dynamicStyles.image}
                          source={{ uri: currentImage.src }}
                        />
                      </TouchableOpacity>
                    </View>
                  </PanGestureHandler>
                </>
              ) : (
                <Text style={dynamicStyles.text}>No images found</Text>
              )}

              <View style={dynamicStyles.buttonContainer}>
                <TouchableOpacity
                  onPress={handlePrevious}
                  disabled={currentIndex === 0}
                  style={[
                    dynamicStyles.navButton,
                    currentIndex === 0 && dynamicStyles.disabledButton,
                  ]}
                  accessibilityLabel="Previous Image"
                >
                  <Text style={dynamicStyles.navButtonText}>Previous</Text>
                </TouchableOpacity>

                <TextInput
                  style={dynamicStyles.input}
                  onChangeText={handleInputChange}
                  value={inputIndex}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  blurOnSubmit={false}
                  selectTextOnFocus={true}
                  accessibilityLabel={`Image ${inputIndex} out of ${
                    maxIndex + 1
                  } images`}
                />

                <TouchableOpacity
                  onPress={handleNext}
                  disabled={currentIndex === maxIndex}
                  style={[
                    dynamicStyles.navButton,
                    currentIndex === maxIndex && dynamicStyles.disabledButton,
                  ]}
                  accessibilityLabel="Next Image"
                >
                  <Text style={dynamicStyles.navButtonText}>Next</Text>
                </TouchableOpacity>
              </View>

              {/* Thumbnails */}
              <FlatList
                data={images.images}
                horizontal={true}
                keyExtractor={(item, index) => item.id || index.toString()}
                renderItem={renderThumbnail}
                style={dynamicStyles.thumbnailList}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 10 }}
                accessibilityLabel="Image thumbnails for direct navigation"
              />

              {/* Text telling user to tap on the image */}
              <Text style={dynamicStyles.tapImageText}>
                tap on the image to be able to "hear" it
              </Text>
            </View>

            <StatusBar />
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
