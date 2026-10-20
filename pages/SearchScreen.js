// ─────────────────────────────────────────────────────────────────────────
// SearchScreen.js
//
// The full-screen search overlay from the UI guide ("Sound and touch_GUIupdate").
// It slides in from the LEFT (left → right) when the search icon on Home is
// pressed or held, and slides back out when closed.
//
//   ┌───────────────────────────────┐
//   │ ☰          (NASA logo)        │  header (matches Home's header)
//   │ 🔍 [ Search the universe ]  ✕ │  search row: blue-outlined field + close
//   ├───────────────────────────────┤
//   │ Suggested Searches            │  gray panel
//   │ Cassiopeia A               ➜  │    - empty field → suggestions
//   │ Crab Nebula                ➜  │    - typing      → matching images
//   │ Bullet Cluster             ➜  │
//   └───────────────────────────────┘
//
// It's a self-contained overlay like SideMenu.js: Home.js decides when to
// show it and hands it the (already ordered) list of images. It never
// reads images.json itself and knows nothing about big/grid view.
//
// PROPS
//   images      Array   the images to search, in display order (Home's orderedImages)
//   onSelect    (index) called AFTER the slide-out finishes, with the index into
//                       `images` of the image the user picked
//   onClose     ()      called AFTER the slide-out finishes when the user taps ✕
//                       (or the Android back button)
//   onOpenMenu  ()      called AFTER the slide-out finishes when the ☰ is tapped
//
// TO CHANGE THE LOOK: colors and the suggested searches are the constants
// at the top of this file.
// ─────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Animated,
  BackHandler,
  Dimensions,
  Image,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

const headerLogo = require("../assets/Group_27_2x.png");
const searchIcon = require("../assets/Search_2x.png");
const menuIcon = require("../assets/Menu_2x.png");

// Colors sampled from the UI guide PDF.
// SEARCH_BLUE is also used by Home.js for the inline search bar.
export const SEARCH_BLUE = "#47B7E2";
const ARROW_RED = "#E24A3B";
const PANEL_GRAY = "#DDE0E0";

// Shown when the search field is empty (from the UI guide). Each must match
// an image title in images.json exactly (ignoring case); if one doesn't,
// tapping it just types it into the search field instead.
export const SUGGESTED_SEARCHES = ["Cassiopeia A", "Crab Nebula", "Bullet Cluster"];

const SLIDE_IN_MS = 250;
const SLIDE_OUT_MS = 200;

// "https://chandra.harvard.edu/photo/2017/geminga" → "2017". Used to tell apart
// the many images that share a title (e.g. 14 different "Cassiopeia A").
function yearOf(image) {
  const match = (image.url || "").match(/\/photo\/(\d{4})\//);
  return match ? match[1] : "";
}

// One row in the gray panel: title on the left, red arrow on the right.
function Row({ title, subtitle, onPress }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
    >
      <View style={styles.rowTextWrap}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      <View style={styles.arrowCircle}>
        <Text style={styles.arrowGlyph}>→</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function SearchScreen({ images, onSelect, onClose, onOpenMenu }) {
  const insets = useSafeAreaInsets(); // keeps the header below the status bar / notch
  const [query, setQuery] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const slide = useRef(new Animated.Value(-width)).current; // starts fully off-screen left
  const inputRef = useRef(null);
  const isClosing = useRef(false);

  // Always call the latest callbacks from Home (they change every render).
  const callbacks = useRef({ onSelect, onClose, onOpenMenu });
  callbacks.current = { onSelect, onClose, onOpenMenu };

  // Slide in, then focus the field so the keyboard comes up.
  useEffect(() => {
    Animated.timing(slide, {
      toValue: 0,
      duration: SLIDE_IN_MS,
      useNativeDriver: true,
    }).start(() => {
      if (inputRef.current) inputRef.current.focus();
    });
  }, []);

  // Shrink the results panel to the space above the keyboard.
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) =>
      setKeyboardHeight(e.endCoordinates ? e.endCoordinates.height : 0)
    );
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Slide out, THEN run `after` (so the next screen change doesn't cut the animation off).
  const closeThen = (after) => {
    if (isClosing.current) return;
    isClosing.current = true;
    Keyboard.dismiss();
    Animated.timing(slide, {
      toValue: -width,
      duration: SLIDE_OUT_MS,
      useNativeDriver: true,
    }).start(() => {
      if (after) after();
    });
  };

  // Android hardware back button closes the search instead of leaving Home.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      closeThen(() => callbacks.current.onClose());
      return true;
    });
    return () => sub.remove();
  }, []);

  const selectIndex = (index) => closeThen(() => callbacks.current.onSelect(index));

  const selectSuggestion = (title) => {
    const index = images.findIndex(
      (img) => img.title.toLowerCase() === title.toLowerCase()
    );
    if (index >= 0) selectIndex(index);
    else setQuery(title);
  };

  // Same matching rule as Home's inline search bar: title starts with what was typed.
  const typed = query.trim().toLowerCase();
  const results = typed
    ? images
        .map((image, index) => ({ image, index }))
        .filter(({ image }) => image.title.toLowerCase().startsWith(typed))
    : [];

  return (
    <Animated.View
      style={[
        styles.overlay,
        { paddingBottom: keyboardHeight, transform: [{ translateX: slide }] },
      ]}
    >
      {/* Black top block: header + search row */}
      <View style={[styles.topBlock, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => closeThen(() => callbacks.current.onOpenMenu())}
            style={styles.menuButton}
            accessibilityRole="button"
            accessibilityLabel="Menu"
          >
            <Image source={menuIcon} style={styles.smallIcon} resizeMode="contain" />
          </TouchableOpacity>
          <Image
            source={headerLogo}
            style={styles.headerLogo}
            resizeMode="contain"
            accessibilityLabel="NASA"
          />
        </View>

        <View style={styles.searchRow}>
          <Image source={searchIcon} style={styles.smallIcon} resizeMode="contain" />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search the universe"
            placeholderTextColor="#8A8A8A"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="Search the universe"
          />
          <TouchableOpacity
            onPress={() => closeThen(() => callbacks.current.onClose())}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close search"
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Gray panel: suggestions when the field is empty, matches while typing */}
      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
        keyboardShouldPersistTaps="handled"
      >
        {typed ? (
          <>
            <Text style={styles.panelHeading}>Results</Text>
            {results.length === 0 ? (
              <Text style={styles.noResults}>No images found</Text>
            ) : (
              results.map(({ image, index }) => (
                <Row
                  key={`${image.id}-${index}`}
                  title={image.title}
                  subtitle={yearOf(image)}
                  onPress={() => selectIndex(index)}
                />
              ))
            )}
          </>
        ) : (
          <>
            <Text style={styles.panelHeading}>Suggested Searches</Text>
            {SUGGESTED_SEARCHES.map((title) => (
              <Row key={title} title={title} onPress={() => selectSuggestion(title)} />
            ))}
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    zIndex: 1000,
    elevation: 20, // Android needs elevation to stack above the screen behind it
  },
  topBlock: {
    backgroundColor: "#000000",
    paddingBottom: 12,
  },
  header: {
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  menuButton: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  headerLogo: {
    height: 40,
    width: 120,
  },
  smallIcon: {
    width: 20,
    height: 20,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginHorizontal: 12,
    paddingHorizontal: 10,
    fontSize: 16,
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: SEARCH_BLUE,
    borderRadius: 3,
    backgroundColor: "#000000",
  },
  closeButton: {
    padding: 6,
  },
  closeText: {
    color: "#FFFFFF",
    fontSize: 22,
  },
  // flexGrow 0: the gray panel is only as tall as its content (white below),
  // flexShrink 1: but shrinks to stay above the keyboard.
  panel: {
    flexGrow: 0,
    flexShrink: 1,
    backgroundColor: PANEL_GRAY,
  },
  panelContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  panelHeading: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#9A9D9D",
  },
  rowTextWrap: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    color: "#000000",
  },
  rowSubtitle: {
    fontSize: 12,
    color: "#555555",
    marginTop: 2,
  },
  arrowCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: ARROW_RED,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  arrowGlyph: {
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "bold",
  },
  noResults: {
    fontSize: 16,
    fontStyle: "italic",
    color: "#555555",
    paddingVertical: 12,
  },
});