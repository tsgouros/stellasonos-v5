import React from "react";
import {
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
import { useNavigation } from '@react-navigation/native';

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
    title: "Our Team",
    screenName: "Team"
  },
  { 
    id: 5, 
    title: "Our Partners",
    screenName: "Partners"
  },
  { 
    id: 6, 
    title: "Settings",
    screenName: "Settings"
  }
];

export default function SideMenu({ onClose }) {
  const navigation = useNavigation();

  const handlePress = (screenName) => {
    navigation.navigate(screenName);
    onClose();
  };

  return (
    <View style={styles.menuContainer}>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
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
    </View>
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