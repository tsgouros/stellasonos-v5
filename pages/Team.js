import React from 'react';
import { Text, StyleSheet } from 'react-native';
import MenuPage, { BodyText } from './MenuPage';

// Our Team + Our Partners + Acknowledgements, all on one page.
// (Edit the lists below to change names/roles.)

const TEAM = [
  ['Tiffany Gao', 'Developer'],
  ['Ning Lan', 'Developer'],
  ['Tom Sgouros', 'Mentor'],
  ['Kim Arcand', 'Mentor'],
];

const PARTNERS = [
  'NASA’s Chandra X-ray Observatory',
  'Chandra X-ray Center, Smithsonian Astrophysical Observatory',
  'NASA’s Universe of Learning',
  'Tactile Universe, University of Portsmouth',
];

export default function Team() {
  return (
    <MenuPage title="Our Team & Partners">
      <Text style={styles.heading} accessibilityRole="header">Our Team</Text>
      {TEAM.map(([name, role]) => (
        <Text key={name} style={styles.person}>
          {name}
          <Text style={styles.role}>{'  ·  ' + role}</Text>
        </Text>
      ))}

      <Text style={[styles.heading, styles.gap]} accessibilityRole="header">Our Partners</Text>
      {PARTNERS.map((p) => (
        <Text key={p} style={styles.person}>{p}</Text>
      ))}

      <Text style={[styles.heading, styles.gap]} accessibilityRole="header">Acknowledgements</Text>
      <BodyText>
        This work was funded by NASA’s Chandra X-ray Observatory under contract NAS8-03060.
        Chandra is operated for NASA by the Smithsonian Astrophysical Observatory. NASA's
        Marshall Space Flight Center in Huntsville, Alabama, manages the Chandra program.
        Funding was also provided by NASA's Universe of Learning (UoL). UoL materials are
        based upon work supported by NASA under award number NNX16AC65A to the Space
        Telescope Science Institute, working in partnership with Caltech/IPAC, Jet Propulsion
        Laboratory, and Smithsonian Astrophysical Observatory.
      </BodyText>
      <BodyText>
        The material contained in this document is based upon work supported by a National
        Aeronautics and Space Administration (NASA) grant or cooperative agreement. Any
        opinions, findings, conclusions or recommendations expressed in this material are
        those of the author and do not necessarily reflect the views of NASA.
      </BodyText>
      <BodyText>
        We gratefully acknowledge our previous team members from Brown University: Ashley
        Chang, Holly Zheng, Anika Mahns, Yumeng Ma, Anna Ohrt, and Effy Pelayo Tran.
      </BodyText>
      <BodyText>
        Background image of the Crab Nebula: X-ray: (Chandra) NASA/CXC/SAO, (IXPE)
        NASA/MSFC; Optical: NASA/ESA/STScI; Image Processing: NASA/CXC/SAO/J. Schmidt,
        K. Arcand, L. Frattare.
      </BodyText>
    </MenuPage>
  );
}

const styles = StyleSheet.create({
  heading: { color: '#FFFFFF', fontSize: 20, fontWeight: '600', marginBottom: 10 },
  gap: { marginTop: 24 },
  person: { color: '#FFFFFF', fontSize: 16, lineHeight: 24, marginBottom: 6 },
  role: { color: '#999999' },
});