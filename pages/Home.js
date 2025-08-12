import React, { useState, useRef } from "react";
import { useFonts, Inter_300Light } from '@expo-google-fonts/inter';
import { PublicSans_400Regular } from '@expo-google-fonts/public-sans';
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

const headerLogo = require("../assets/Group_27_2x.png");
const playIcon = require("../assets/Icon_ion-play-circle_2x.png");
const searchIcon = require("../assets/Search_2x.png");
const menuIcon = require("../assets/Menu_2x.png");


export default function Home({ navigation }) {
  const [searchText, setSearchText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputIndex, setInputIndex] = useState("1");
  const [showDropdown, setShowDropdown] = useState(false);

  const panRef = useRef();
  const flatListRef = useRef(); // Added FlatList ref

  const filteredImages =
    searchText.length > 0
      ? images.images.filter((img) =>
          img.title.toLowerCase().startsWith(searchText.toLowerCase())
        )
      : [];

  const maxIndex = images.images.length - 1;

  const scrollToThumbnail = (index) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
    }
  };

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
    scrollToThumbnail(index); // Center selected thumbnail
  };

  const handleInputChange = (text) => setInputIndex(text);

  const handleSubmit = () => {
    const newIndex = parseInt(inputIndex) - 1;
    if (!isNaN(newIndex) && newIndex >= 0 && newIndex <= maxIndex) {
      setCurrentIndex(newIndex);
      scrollToThumbnail(newIndex); // Center
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
      scrollToThumbnail(newIndex); // Center
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setInputIndex((newIndex + 1).toString());
      scrollToThumbnail(newIndex); // Center
    }
  };

  const navigateToImagePage = (image) => {
    navigation.navigate("TestSeg", { image });
    console.log("%%%%%%%%%%--------------------%%%%%%%%%%")
    console.log("Navigating to Image page with image: " + image.title);
  };

  const goBack = () => navigation.goBack();

  const onPanGestureEvent = (event) => {
    const { translationX, state } = event.nativeEvent;

    if (event.nativeEvent.state === 5) {
      if (translationX < -50 && currentIndex < maxIndex) {
        handleNext();
      } else if (translationX > 50 && currentIndex > 0) {
        handlePrevious();
      }
    }
  };

  const dynamicStyles = {
    container: {
      flex: 1,
      backgroundColor: "#000000",
    },
    headerContainer: {
      width: "100%",
      height: 60,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#000000",
      paddingHorizontal: 15,
      paddingVertical: 5,
      position: "relative",
      flexDirection: "row",
    },
    headerIconWrapper: {
      position: "absolute",
      top: 0,
      bottom: 0,
      justifyContent: "center",
      paddingHorizontal: 10,
    },
    leftIcon: {
      left: 0,
    },
    rightIcon: {
      right: 0,
    },
    headerImage: {
      height: 40,
      width: 120,
    },
    searchContainer: {
      width: "100%",
      backgroundColor: "#000000",
      paddingHorizontal: 1,
      paddingBottom: 5,
      zIndex: 20,
      ...Platform.select({
        android: {
          marginTop: 20,
        },
      }),
    },
    searchInput: {
      width: "100%",
      height: 40,
      fontSize: 18,
      borderWidth: 1,
      borderColor: "#FFFFFF",
      borderRadius: 3,
      paddingHorizontal: 10,
      color: "#FFFFFF",
      backgroundColor: "#000000",
    },
    dropdown: {
      maxHeight: 150,
      borderWidth: 1,
      borderColor: "#ccc",
      borderRadius: 6,
      backgroundColor: "#000000",
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
      color: "#FFFFFF",
    },
    noResultsText: {
      padding: 10,
      fontStyle: "italic",
      color: "#999",
    },
    titleBelowSearch: {
      color: "#FFFFFF",
      fontSize: 20,
      fontWeight: "600",
      textAlign: "left",
      paddingHorizontal: 10,
      marginTop: 40,
    },
    contentContainer: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: 10,
      paddingTop: 40,
    },
    imageContainer: {
      borderRadius: 8,
      backgroundColor: "#000000",
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
      backgroundColor: "transparent",
    },
    text: {
      marginBottom: 20,
      marginTop: 10,
      fontSize: 24,
      fontWeight: "bold",
      textAlign: "left",
      color: "white",
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
      backgroundColor: "#000000",
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 3,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "#FFFFFF",
    },
    disabledButton: {
      backgroundColor: "#000000",
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
      color: "#FFFFFF",
      textAlign: "center",
      fontStyle: "italic",
    },
    thumbnailList: {
      marginTop: 50,
      maxHeight: 90,
    },
    thumbnailItem: {
      width: 90,
      height: 90,
      marginRight: 10,
      borderWidth: 2,
      overflow: "hidden",
    },
    thumbnailSelected: {
      borderWidth: 1,
      borderColor: "white",
      borderRadius: 3,
    },
    thumbnailUnselected: {
      borderWidth: 1,
      borderColor: "black",
      borderRadius: 3,
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
        style={{ width:90, height: 90, borderRadius: 6 }}
      />
    </TouchableOpacity>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={dynamicStyles.container}>

        {/* HEADER */}
        <View style={dynamicStyles.headerContainer}>
          {/* Left Menu Button */}
          <TouchableOpacity
            onPress={() => console.log("Menu icon pressed")}
            style={[dynamicStyles.headerIconWrapper, dynamicStyles.leftIcon]}
          >
            <Image
              source={menuIcon}
              style={{ width: 20, height: 20 }}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* Center NASA Logo */}
          <Image
            source={headerLogo}
            style={dynamicStyles.headerImage}
            resizeMode="contain"
          />

          {/* Right Search Button */}
          <TouchableOpacity
            onPress={() => console.log("Search icon pressed")}
            style={[dynamicStyles.headerIconWrapper, dynamicStyles.rightIcon]}
          >
            <Image
              source={searchIcon}
              style={{ width: 20, height: 20 }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
          >
            <View style={dynamicStyles.searchContainer}>
              <TextInput
                placeholder="Search images by title..."
                placeholderTextColor="#777575ff"
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

            {currentImage && (
              <Text style={dynamicStyles.titleBelowSearch}>
                {currentImage.title}
              </Text>
            )}

            <View style={dynamicStyles.contentContainer}>
              {currentImage ? (
                <>
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
                <View style={{ width: 120, alignItems: "flex-end" }}>
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
                </View>

                <TouchableOpacity
                  onPress={() => navigateToImagePage(currentImage)}
                  accessibilityLabel="Play button"
                  accessibilityHint="Navigates to image details"
                  style={{ marginHorizontal: 20 }}
                >
                  <Image
                    source={playIcon}
                    style={{ width: 40, height: 40 }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>

                <View style={{ width: 120, alignItems: "flex-start" }}>
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
              </View>

              <FlatList
                ref={flatListRef}
                data={images.images}
                horizontal={true}
                keyExtractor={(item, index) => item.id || index.toString()}
                renderItem={renderThumbnail}
                style={dynamicStyles.thumbnailList}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 5 }}
                accessibilityLabel="Image thumbnails for direct navigation"
                getItemLayout={(data, index) => ({
                  length: 100,
                  offset: 100 * index,
                  index,
                })}
              />

            </View>

            <StatusBar />
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
