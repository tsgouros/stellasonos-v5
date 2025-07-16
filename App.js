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

// Create a stack navigator instance
const Stack = createNativeStackNavigator();

export default function App() { //main app component
  return (
    //navigation container to enable navigation throughout the app
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Intro" //first screen shown when app loads

        screenOptions={{
          headerShown: false  // Hide the app header
        }}>

        <Stack.Screen name="Intro" component={Intro} /> 
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="ImagePage" component={ImagePage} />

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
