import React from 'react';
import MenuPage, { BodyText, Heading, ListItem } from './MenuPage';

// How to Use the App page. Text provided by Kim Arcand (Nov 2026).

export default function HowToUse() {
  return (
    <MenuPage title="How to Use the App">
      <BodyText>
        Explore your universe through sight, sound, and touch! This app
        transforms astronomical images into interactive experiences using
        sonification (sound) and haptics (vibrations you can feel through your
        phone).
      </BodyText>
      <BodyText>
        Touch and drag across the image to explore its sounds and vibrations.
      </BodyText>

      <Heading>Getting Started</Heading>
      <ListItem marker="1." lead="Choose an image.">
        Browse the collection of astronomical objects. Switch between Full and
        Grid views to explore the images, or use the search icon to find a
        specific object.
      </ListItem>
      <ListItem marker="2." lead="Press Play.">
        Tap the Play button to launch an image and begin the sonification.
      </ListItem>
      <ListItem marker="3." lead="Explore with your finger.">
        Touch and drag your finger across the image to hear sounds and feel
        vibrations associated with different regions. Notice how the experience
        changes as you move around the image.
      </ListItem>
      <ListItem marker="4." lead="Discover more.">
        Use Previous and Next to move between images, or tap a thumbnail to
        select another view.
      </ListItem>
      <ListItem marker="5." lead="Explore the details.">
        On an image’s exploration screen, use Read Alt Text to access a written
        description of the astronomical image.
      </ListItem>

      <Heading>Tips for Exploring</Heading>
      <ListItem>
        Turn up your phone’s volume or use headphones to hear the sounds
        clearly.
      </ListItem>
      <ListItem>
        Make sure haptic feedback is enabled on your device to experience the
        vibrations.
      </ListItem>
      <ListItem>
        Try exploring the same image slowly and quickly, or moving between
        bright and dark regions. What differences do you notice?
      </ListItem>
      <ListItem>Use Reload to refresh the image collection.</ListItem>

      <BodyText>
        Each image tells a different cosmic story. What can you discover by
        listening and feeling as well as looking?
      </BodyText>
    </MenuPage>
  );
}