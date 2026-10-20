import React, { useState, useRef, useMemo } from "react";
import SideMenu from "../pages/SideMenu";
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

// Display order lives in its own file — see utils/imageOrder.js.
// Everything on this screen reads from `orderedImages` (below), never from
// images.images directly, so changing how images are ordered is a one-file change.
import { createOrder, applyOrder } from "../utils/imageOrder.js";

// Grid ("Instagram") view layout
const GRID_COLUMNS = 3;
const GRID_GAP = 2;
const GRID_TILE_SIZE = width / GRID_COLUMNS - GRID_GAP;

const headerLogo = require("../assets/Group_27_2x.png");
const playIcon = require("../assets/Icon_ion-play-circle_2x.png");
const searchIcon = require("../assets/Search_2x.png");
const menuIcon = require("../assets/Menu_2x.png");

export default function Home({ navigation }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputIndex, setInputIndex] = useState("1");
  const [showDropdown, setShowDropdown] = useState(false);

  // "big" = one large image at a time (the original view)
  // "grid" = small square icons you scroll through, Instagram-style
  const [viewMode, setViewMode] = useState("big");
  const [isReloading, setIsReloading] = useState(false);

  // The order object: { displayPosition: indexInImagesJson }. See utils/imageOrder.js.
  const [order, setOrder] = useState(() => createOrder(images.images.length));
  const orderedImages = useMemo(() => applyOrder(images.images, order), [order]);

  const panRef = useRef();
  const flatListRef = useRef();
  const gridRef = useRef();

  const filteredImages =
    searchText.length > 0
      ? orderedImages.filter((img) =>
          img.title.toLowerCase().startsWith(searchText.toLowerCase())
        )
      : [];

  const maxIndex = orderedImages.length - 1;

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

  // Picking an image (from the search dropdown, the thumbnail strip, or by
  // tapping a tile in the grid) shows it large. If we were in grid view this
  // switches to big view; the thumbnail strip jumps to it when it mounts
  // (see initialScrollIndex on the strip below).
  const onSelectImage = (index) => {
    setCurrentIndex(index);
    setInputIndex((index + 1).toString());
    setSearchText("");
    setShowDropdown(false);
    setViewMode("big");
    Keyboard.dismiss();
    scrollToThumbnail(index);
  };

  // Reload: re-scramble the order and go back to the top. Triggered by the
  // Reload button and by pulling down on the grid.
  const handleReload = () => {
    setIsReloading(true);
    setOrder(createOrder(images.images.length));
    setCurrentIndex(0);
    setInputIndex("1");
    setSearchText("");
    setShowDropdown(false);
    if (gridRef.current) gridRef.current.scrollToOffset({ offset: 0, animated: false });
    if (flatListRef.current) flatListRef.current.scrollToOffset({ offset: 0, animated: false });
    // brief spinner so the pull-to-refresh feels responsive
    setTimeout(() => setIsReloading(false), 400);
  };

  const handleInputChange = (text) => setInputIndex(text);

  const handleSubmit = () => {
    const newIndex = parseInt(inputIndex) - 1;
    if (!isNaN(newIndex) && newIndex >= 0 && newIndex <= maxIndex) {
      setCurrentIndex(newIndex);
      scrollToThumbnail(newIndex);
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
      scrollToThumbnail(newIndex);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setInputIndex((newIndex + 1).toString());
      scrollToThumbnail(newIndex);
    }
  };

  const navigateToImagePage = (image) => {

    if (!image) {
    console.warn("No image selected to navigate");
    return;
  }
    navigation.navigate("ImagePage", { image });
    console.log("Navigating to Image page with image: " + image.title);
  };

  const onPanGestureEvent = (event) => {
    const { translationX } = event.nativeEvent;

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
    captionBelowTitle: {
      color: "#CCCCCC",
      fontSize: 14,
      fontWeight: "400",
      textAlign: "left",
      paddingHorizontal: 10,
      marginTop: 4,
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
    // --- Big / Grid toggle row + Reload button ---
    toggleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: "#000000",
    },
    segmented: {
      flexDirection: "row",
      borderWidth: 1,
      borderColor: "#FFFFFF",
      borderRadius: 3,
      overflow: "hidden",
    },
    segButton: {
      paddingVertical: 8,
      paddingHorizontal: 22,
      backgroundColor: "#000000",
    },
    segButtonSelected: {
      backgroundColor: "#FFFFFF",
    },
    segText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
    segTextSelected: {
      color: "#000000",
    },
    reloadButton: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: "#FFFFFF",
      borderRadius: 3,
      backgroundColor: "#000000",
    },
    reloadText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
    // --- Grid view ---
    gridList: {
      flex: 1,
    },
    gridTile: {
      width: GRID_TILE_SIZE,
      height: GRID_TILE_SIZE,
      margin: GRID_GAP / 2,
      backgroundColor: "#111111",
    },
    gridImage: {
      width: "100%",
      height: "100%",
    },
  };

  const currentImage = orderedImages[currentIndex];

  // One square tile in the grid view. Tapping it shows that image large.
  const renderGridTile = ({ item, index }) => (
    <TouchableOpacity
      onPress={() => onSelectImage(index)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      accessibilityHint="Shows this image large"
      style={dynamicStyles.gridTile}
    >
      <Image
        source={{ uri: item.src }}
        style={dynamicStyles.gridImage}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

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
        style={{ width: 90, height: 90, borderRadius: 6 }}
      />
    </TouchableOpacity>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={dynamicStyles.container}>

        {/* Side menu only shows when isMenuOpen true */}
        {isMenuOpen && (
          <SideMenu onClose={() => setIsMenuOpen(false)} />
        )}

        {/* HEADER */}
        <View style={dynamicStyles.headerContainer}>
          {/* Left Menu Button */}
          <TouchableOpacity
            onPress={() => setIsMenuOpen(true)}
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
            {/* Big / Grid toggle (left) + Reload (right) */}
            <View style={dynamicStyles.toggleRow}>
              <View style={dynamicStyles.segmented}>
                {[
                  ["big", "Big"],
                  ["grid", "Grid"],
                ].map(([mode, label]) => {
                  const selected = viewMode === mode;
                  return (
                    <TouchableOpacity
                      key={mode}
                      onPress={() => setViewMode(mode)}
                      accessibilityRole="button"
                      accessibilityLabel={`${label} view`}
                      accessibilityState={{ selected }}
                      style={[
                        dynamicStyles.segButton,
                        selected && dynamicStyles.segButtonSelected,
                      ]}
                    >
                      <Text
                        style={[
                          dynamicStyles.segText,
                          selected && dynamicStyles.segTextSelected,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                onPress={handleReload}
                accessibilityRole="button"
                accessibilityLabel="Reload"
                accessibilityHint="Shuffles the images into a new order"
                style={dynamicStyles.reloadButton}
              >
                <Text style={dynamicStyles.reloadText}>↻ Reload</Text>
              </TouchableOpacity>
            </View>

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
                    const idx = orderedImages.indexOf(img);
                    return (
                      <TouchableOpacity
                        key={`${img.id}-${idx}`}
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

            {/* ---- BIG VIEW: title, caption, large image, nav buttons, thumbnail strip ---- */}
            {viewMode === "big" && currentImage && (
              <>
                <Text style={dynamicStyles.titleBelowSearch}>
                  {currentImage.title}
                </Text>
                {/* Short caption, from images.json's `description` field —
                    see docs/CODE_OVERVIEW.md for how this differs from altText */}
                {!!currentImage.description && (
                  <Text style={dynamicStyles.captionBelowTitle}>
                    {currentImage.description}
                  </Text>
                )}
              </>
            )}

            {viewMode === "big" && (
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
                data={orderedImages}
                // When coming back from grid view, open the strip at the selected image
                initialScrollIndex={currentIndex}
                horizontal={true}
                keyExtractor={(item, index) => `${item.id}-${index}`}
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
            )}

            {/* ---- GRID VIEW: small square icons, scroll like Instagram.
                Tap a tile → big view of that image. Pull down → reload. ---- */}
            {viewMode === "grid" && (
              <FlatList
                ref={gridRef}
                data={orderedImages}
                renderItem={renderGridTile}
                // id + position: images.json has 3 entries (Geminga, CL J1001,
                // Zwicky 8338) listed twice with the same id, which would collide
                keyExtractor={(item, index) => `${item.id}-${index}`}
                numColumns={GRID_COLUMNS}
                style={dynamicStyles.gridList}
                refreshing={isReloading}
                onRefresh={handleReload}
                initialNumToRender={18}
                windowSize={7}
                keyboardShouldPersistTaps="handled"
                accessibilityLabel="Image grid"
              />
            )}

            <StatusBar />
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}