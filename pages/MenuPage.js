// ─────────────────────────────────────────────────────────────────────────
// MenuPage.js
//
// Shared frame for the screens reached from the burger menu (About, How to
// Use, Team, Partners, Settings): black background, the same header as Home
// (☰ menu on the left, NASA logo in the middle), then a title and the page's
// content underneath.
//
// Each page just does:
//   <MenuPage title="Our Team"> ...content... </MenuPage>
// so when real content/design arrives, only that page's file changes.
// Tapping ☰ opens the same sliding SideMenu as on Home.
// ─────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import SideMenu from "./SideMenu";

const headerLogo = require("../assets/Group_27_2x.png");
const menuIcon = require("../assets/Menu_2x.png");

export default function MenuPage({ title, children }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      {isMenuOpen && <SideMenu onClose={() => setIsMenuOpen(false)} />}

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setIsMenuOpen(true)}
          style={styles.menuButton}
          accessibilityRole="button"
          accessibilityLabel="Menu"
        >
          <Image source={menuIcon} style={styles.menuIcon} resizeMode="contain" />
        </TouchableOpacity>
        <Image
          source={headerLogo}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="NASA"
        />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

// Standard paragraph text for page content.
export function BodyText({ children }) {
  return <Text style={styles.bodyText}>{children}</Text>;
}

// Clearly-marked placeholder line, so unfinished pages don't look finished.
export function Placeholder({ children }) {
  return <Text style={styles.placeholder}>{children}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
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
  menuIcon: { width: 20, height: 20 },
  logo: { width: 120, height: 40 },
  body: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  title: { color: "#FFFFFF", fontSize: 24, fontWeight: "600", marginBottom: 16 },
  bodyText: { color: "#FFFFFF", fontSize: 16, lineHeight: 24, marginBottom: 16 },
  placeholder: {
    color: "#999999",
    fontSize: 16,
    fontStyle: "italic",
    lineHeight: 24,
    marginBottom: 16,
  },
});