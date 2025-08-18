import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'react-native';

//Utils
import { ContainerStyles, ButtonStyles, TextStyles } from '../utils/styles.js';


export default function Intro({ navigation }) {
  return (
    <TouchableOpacity
      style={[ContainerStyles.defaultContainer, { padding: 20 }]} // Increased padding for larger touch target
      onPress={() => navigation.navigate('Home')}
      accessible={true}
      accessibilityLabel="Welcome!"
      accessibilityHint="Double tap anywhere to start."
      activeOpacity={1}
    >
      <Text style={TextStyles.textSmall} accessibilityRole="text">Welcome! Tap anywhere to start.</Text>
      <StatusBar style="auto" />
    </TouchableOpacity>
  );
}