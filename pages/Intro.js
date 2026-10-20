import React from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions, Platform } from 'react-native';
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
      {/* NASA logo at the top (UI guide). Absolute, so the centered
          welcome content below doesn't move. Decorative: the screen reader
          reads the whole screen as "Welcome!" via the label above. */}
      <Image
        source={require('../assets/Group_27_2x.png')}
        style={{
          position: 'absolute',
          top: Platform.OS === 'ios' ? 60 : 30,
          width: 120,
          height: 40,
          resizeMode: 'contain',
        }}
      />

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

      {/* Website at the bottom (UI guide) */}
      <Text
        style={{
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 40 : 24,
          color: '#FFFFFF',
          fontSize: 14,
        }}
      >
        chandra.si.edu/sound/stellasonos.html
      </Text>

      <StatusBar style="auto" />
    </TouchableOpacity>
  );
}