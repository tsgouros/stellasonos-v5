import React from 'react';
import MenuPage, { BodyText, Placeholder } from './MenuPage';

export default function About() {
  return (
    <MenuPage title="About the Project">
      <BodyText>
        Stellasonos turns images from NASA’s Chandra X-ray Observatory into sound
        and touch, so blind and low-vision users can explore the universe.
      </BodyText>
      <Placeholder>More about the project is coming soon.</Placeholder>
    </MenuPage>
  );
}