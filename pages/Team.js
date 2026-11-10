import React from 'react';
import MenuPage, { BodyText, Heading, ListItem } from './MenuPage';

// Our Team & Partners page. Text provided by Kim Arcand (Nov 2026).
// To change a name or role, edit the list below.

const TEAM = [
  ['Tiffany Gao', 'Developer, Brown University'],
  ['Ning Lan', 'Developer, Brown University'],
  ['Tom Sgouros', 'Project Advisor, Brown University'],
  ['Dr. Kimberly Arcand, PI', 'Project Advisor, Chandra X-ray Observatory/SAO'],
];

export default function Team() {
  return (
    <MenuPage title="Our Team & Partners">
      <BodyText>A NASA/CXO/SAO application</BodyText>

      <Heading>Development Team</Heading>
      {TEAM.map(([name, role]) => (
        <ListItem key={name}>
          {name} — {role}
        </ListItem>
      ))}

      <Heading>Previous Developers</Heading>
      <BodyText>
        Ashley Chang, Holly Zheng, Anika Mahns, Yumeng Ma, Anna Ohrt, and Effy
        Pelayo Tran (Brown University).
      </BodyText>

      <Heading>Funding</Heading>
      <BodyText>
        This project was funded by NASA’s Chandra X-ray Observatory (CXO) under
        contract NAS8-03060 and by NASA’s Universe of Learning (award
        NNX16AC65A). Chandra is operated for NASA by the Smithsonian
        Astrophysical Observatory (SAO), with program management by NASA’s
        Marshall Space Flight Center. NASA’s Universe of Learning is led by the
        Space Telescope Science Institute in partnership with Caltech/IPAC,
        NASA’s Jet Propulsion Laboratory, and the Smithsonian Astrophysical
        Observatory.
      </BodyText>
    </MenuPage>
  );
}