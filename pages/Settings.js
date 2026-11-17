import React, { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import MenuPage, { Heading, ListItem } from './MenuPage';
import { getSettings, setSetting, subscribe } from '../utils/settings';

function ToggleRow({ label, description, value, onChange }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: '#555555', true: '#4C8DFF' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export default function Settings() {
  const [s, setS] = useState({ ...getSettings() });
  useEffect(() => subscribe(setS), []);

  return (
    <MenuPage title="Settings">
      <Heading>Feedback</Heading>
      <ToggleRow
        label="Sound"
        description="Play a sound when you touch part of an image."
        value={s.soundOn}
        onChange={(v) => setSetting('soundOn', v)}
      />
      <ToggleRow
        label="Haptics"
        description="Vibrate when you touch part of an image."
        value={s.hapticsOn}
        onChange={(v) => setSetting('hapticsOn', v)}
      />

      <Heading>Not hearing or feeling anything?</Heading>
      <ListItem lead="Sound.">Make sure Sound is on above.</ListItem>
      <ListItem lead="Volume.">Turn up your phone’s volume and check that it isn’t on silent.</ListItem>
      <ListItem lead="Haptics.">Make sure Haptics is on above. Your phone’s system vibration settings also need to be on.</ListItem>
    </MenuPage>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  rowText: { flex: 1, paddingRight: 16 },
  rowLabel: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', marginBottom: 2 },
  rowDesc: { color: '#BBBBBB', fontSize: 14, lineHeight: 20 },
});