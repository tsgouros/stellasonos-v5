import React from 'react';
import MenuPage, { BodyText, Placeholder } from './MenuPage';

export default function HowToUse() {
  return (
    <MenuPage title="How to Use the App">
      <BodyText>
        Pick an image on the home screen, then press play. Touch and drag your
        finger across the image to hear and feel what is under it.
      </BodyText>
      <Placeholder>Step-by-step instructions are coming soon.</Placeholder>
    </MenuPage>
  );
}