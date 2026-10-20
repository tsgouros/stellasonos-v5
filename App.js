import React from 'react';
import { 
    Text, 
    View, 
    TouchableOpacity, 
    StyleSheet, 
    Image 
} from 'react-native';

// Navigation-related imports
import { NavigationContainer } from '@react-navigation/native'; //manage app navigation state
import { createNativeStackNavigator } from '@react-navigation/native-stack'; //stack navigator for navigating between screens

// Utils and other pages
import Intro from './pages/Intro';
import Home from './pages/Home';
import ImagePage from './pages/ImagePage.js';
import TestSeg from './pages/TestSeg.js';

import About from './pages/About';
import HowToUse from './pages/HowToUse';
import Team from './pages/Team';
import Settings from './pages/Settings';

// Create a stack navigator instance
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Intro"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Intro" component={Intro} />
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="ImagePage" component={ImagePage} />
        <Stack.Screen name="TestSeg" component={TestSeg} />
        
        {/* Add all your menu screens */}
        {/* These fade in (instead of sliding) because the burger menu has
            already slid in; a second slide looked like a double transition. */}
        <Stack.Screen name="About" component={About} options={{ animation: 'fade' }} />
        <Stack.Screen name="HowToUse" component={HowToUse} options={{ animation: 'fade' }} />
        <Stack.Screen name="Team" component={Team} options={{ animation: 'fade' }} />
        <Stack.Screen name="Settings" component={Settings} options={{ animation: 'fade' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}


// Define styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});