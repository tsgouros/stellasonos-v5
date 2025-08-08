import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

export const ContainerStyles = StyleSheet.create({
  defaultContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },

  defaultCard: {
    flex: 1,
    borderRadius: 15,
    borderWidth: 5,
    borderColor: "#E8E8E8",
    justifyContent: "center",
    backgroundColor: "white",
    overflow: 'hidden',
  },
});

export const ButtonStyles = StyleSheet.create({
  blackButton: {
    backgroundColor: "#111",
    marginTop: 15,
    padding: 10,
    borderRadius: 10,
  },
});

export const TextStyles = StyleSheet.create({
  textSmall: {
    fontSize: 18,
    color: "#FFFFFF",
    justifyContent: 'center',
    textAlign: 'center',
    maxWidth: '80%',
    backgroundColor: "transparent"
  },

  textMedium: {
    fontSize: 35,
    color: "#FFFFFF",
    justifyContent: 'center',
    textAlign: "center",
    backgroundColor: "transparent"
  },

  textLarge: {
    fontSize: 50,
    color: "#FFFFFF",
    justifyContent: 'center',
    textAlign: "center",
    backgroundColor: "transparent"
  },

  whiteTextSmall: {
    fontSize: 18,
    color: '#fff',
  },
});

export const ImageStyles = StyleSheet.create({
  defaultImage: {
    width: 300,
    height: 300,
    resizeMode: 'cover',
    marginTop: 20,
  },
});