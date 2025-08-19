import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HowToUse() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>How to Use the App</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
  },
});