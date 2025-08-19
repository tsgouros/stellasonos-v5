import React from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions } from 'react-native';
import { StatusBar } from 'react-native';
import { ContainerStyles, TextStyles } from '../utils/styles.js';

const { width: screenWidth } = Dimensions.get('window');

export default function Intro({ navigation }) {
  return (
    <TouchableOpacity
      style={[ContainerStyles.defaultContainer, { padding: 20, alignItems: 'center' }]}
      onPress={() => navigation.navigate('Home')}
      accessible={true}
      accessibilityLabel="Welcome!"
      accessibilityHint="Double tap anywhere to start."
      activeOpacity={1}
    >
      <View style={{ alignItems: 'center', gap: 4 }}> 
        <Image
          source={require('../assets/Group_25_2x.png')}
          style={{
            width: screenWidth * 0.6,
            height: screenWidth * 0.3, // shorter height
            resizeMode: 'contain',
            marginBottom: 5, // small space between images
          }}
        />

        <Image
          source={require('../assets/Group_36_2x.png')}
          style={{
            width: screenWidth * 0.6,
            height: screenWidth * 0.3,
            resizeMode: 'contain',
          }}
        />
      </View>

      <Text style={[TextStyles.textSmall, { marginTop: 16 }]} accessibilityRole="text">
        Welcome! Tap anywhere to start.
      </Text>

      <StatusBar style="auto" />
    </TouchableOpacity>
  );
}
