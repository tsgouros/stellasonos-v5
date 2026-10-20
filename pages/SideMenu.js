import React, { useEffect, useRef } from "react";
import {
  Animated,
  BackHandler,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native";
import { useNavigation, useRoute } from '@react-navigation/native';

const { width, height } = Dimensions.get("window");
const searchIcon = require("../assets/Search_2x.png");

const menuItems = [
  { 
    id: 1, 
    title: "About the Project",
    screenName: "About"
  },
  { 
    id: 2, 
    title: "How to Use the App",
    screenName: "HowToUse" 
  },
  { 
    id: 3, 
    title: "Explore the Galaxy",
    icon: searchIcon,
    special: true,
    screenName: "Home"
  },
  { 
    id: 4, 
    title: "Our Team & Partners",
    screenName: "Team"
  },
  { 
    id: 6, 
    title: "Settings",
    screenName: "Settings"
  }
];

export default function SideMenu({ onClose }) {
  const navigation = useNavigation();
  const route = useRoute(); // which screen this menu is open on

  // Slides in from the left (like the search screen), and slides back out
  // before it is removed.
  const slide = useRef(new Animated.Value(-width)).current;
  const isClosing = useRef(false);

  useEffect(() => {
    Animated.timing(slide, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, []);

  const closeThen = (after) => {
    if (isClosing.current) return;
    isClosing.current = true;
    Animated.timing(slide, { toValue: -width, duration: 200, useNativeDriver: true }).start(() => {
      if (after) after();
      onClose();
    });
  };

  // Android back button closes the menu instead of leaving Home.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      closeThen();
      return true;
    });
    return () => sub.remove();
  }, []);

  // Going to another page: start the page's fade-in right away and keep the
  // (black) menu covering the old screen until it has finished. That way
  // there is only ONE motion (the menu sliding in); the page doesn't slide
  // in a second time after the menu slides out.
  // Picking the page we're already on just closes the menu.
  const handlePress = (screenName) => {
    if (screenName === route.name) {
      closeThen();
      return;
    }
    if (isClosing.current) return;
    isClosing.current = true;
    navigation.navigate(screenName);
    setTimeout(onClose, 450);
  };

  return (
    <Animated.View style={[styles.menuContainer, { transform: [{ translateX: slide }] }]}>
      {/* NASA logo, matching the header on the other screens */}
      <View style={styles.logoWrap} pointerEvents="none">
        <Image
          source={require("../assets/Group_27_2x.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="NASA"
        />
      </View>

      <TouchableOpacity onPress={() => closeThen()} style={styles.closeButton}>
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.menuContent}>
        {menuItems.map((item) => (
          <React.Fragment key={item.id}>
            {item.special ? (
              <TouchableOpacity 
                style={styles.menuItemRow}
                onPress={() => handlePress(item.screenName)}
              >
                <Text style={styles.menuItemRowText}>{item.title}</Text>
                <Image source={item.icon} style={styles.icon} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.menuItemButton}
                onPress={() => handlePress(item.screenName)}
              >
                <Text style={styles.menuItem}>{item.title}</Text>
              </TouchableOpacity>
            )}
            
            {item.id === 3 && <View style={styles.separator} />}
          </React.Fragment>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const STATUSBAR_HEIGHT =
  Platform.OS === "android" ? StatusBar.currentHeight || 24 : 44;

const styles = StyleSheet.create({
  menuContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    width,
    height,
    backgroundColor: "#000",
    zIndex: 9999,
  },
  closeButton: {
    position: "absolute",
    top: STATUSBAR_HEIGHT + 30,
    left: 10,
    zIndex: 10000,
    padding: 10,
  },
  logoWrap: {
    position: "absolute",
    top: STATUSBAR_HEIGHT + 28,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  logo: {
    width: 120,
    height: 40,
  },
  closeButtonText: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "bold",
  },
  menuContent: {
    minHeight: height,
    justifyContent: "center",
    alignItems: "stretch",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  menuItem: {
    color: "#fff",
    fontSize: 20,
    marginBottom: 30,
    textAlign: "left",
    alignSelf: "stretch",
  },
  menuItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 100,
    alignSelf: "stretch",
  },
  menuItemRowText: {
    color: "#fff",
    fontSize: 20,
    textAlign: "left",
    flexShrink: 1,
  },
  icon: {
    width: 20,
    height: 20,
    tintColor: "#fff",
  },
  separator: {
    height: 1,
    backgroundColor: "#fff",
    marginVertical: 20,
    alignSelf: "stretch",
  },
});