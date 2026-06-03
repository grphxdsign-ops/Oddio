import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Arrangement } from '../types/music';

type SourceReferencePanelProps = {
  arrangement: Arrangement;
  activeMeasure: number;
  tempo: number;
};

export function SourceReferencePanel({
  activeMeasure,
  arrangement,
  tempo,
}: SourceReferencePanelProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.topRow}>
        <View style={styles.sourceMark}>
          <Ionicons color="#F7F4EA" name="open-outline" size={18} />
        </View>
        <View style={styles.copyBlock}>
          <Text style={styles.title}>Reference on {arrangement.sourceName}</Text>
          <Text style={styles.body}>
            OddioAI links to the source for tab or sheet music. The app does not copy,
            re-host, or generate notation for this song.
          </Text>
        </View>
      </View>

      <View style={styles.referenceMeta}>
        <Text style={styles.metaPill}>bar focus {activeMeasure}</Text>
        <Text style={styles.metaPill}>{tempo} bpm practice</Text>
        <Text style={styles.metaPill}>reference-only</Text>
      </View>

      <Pressable
        onPress={() => Linking.openURL(arrangement.externalUrl)}
        style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}
      >
        <Ionicons color="#F7F4EA" name="navigate-circle-outline" size={18} />
        <Text style={styles.openButtonText}>Open {arrangement.sourceName}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#F7F4EA',
    borderColor: '#D8CEBA',
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 14,
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  sourceMark: {
    alignItems: 'center',
    backgroundColor: '#2E7D6E',
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  copyBlock: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  title: {
    color: '#18201C',
    fontSize: 16,
    fontWeight: '900',
  },
  body: {
    color: '#566158',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  referenceMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  metaPill: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4DED1',
    borderRadius: 999,
    borderWidth: 1,
    color: '#4E5851',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 9,
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  openButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#2E7D6E',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  openButtonText: {
    color: '#F7F4EA',
    fontSize: 14,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.76,
    transform: [{ translateY: 1 }],
  },
});
