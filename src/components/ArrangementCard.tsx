import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Arrangement } from '../types/music';

type ArrangementCardProps = {
  arrangement: Arrangement;
  isSelected: boolean;
  onPress: () => void;
};

const sourceLabels: Record<Arrangement['source'], string> = {
  'external-reference': 'reference',
  'imslp-reference': 'imslp',
  'musicnotes-reference': 'musicnotes',
  'songsterr-reference': 'songsterr',
  'user-upload': 'yours',
};

export function ArrangementCard({ arrangement, isSelected, onPress }: ArrangementCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isSelected && styles.cardActive,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, isSelected && styles.iconWrapActive]}>
          <Ionicons
            color={isSelected ? '#F7F4EA' : '#2E7D6E'}
            name={arrangement.instrument === 'guitar' ? 'radio-outline' : 'musical-note-outline'}
            size={18}
          />
        </View>
        <Text style={[styles.badge, isSelected && styles.badgeActive]}>
          {sourceLabels[arrangement.source]}
        </Text>
      </View>
      <Text numberOfLines={2} style={[styles.title, isSelected && styles.titleActive]}>
        {arrangement.title}
      </Text>
      <Text numberOfLines={1} style={[styles.artist, isSelected && styles.artistActive]}>
        {arrangement.artist}
      </Text>
      <View style={styles.metaRow}>
        <Text style={[styles.meta, isSelected && styles.metaActive]}>{arrangement.difficulty}</Text>
        <Text style={[styles.meta, isSelected && styles.metaActive]}>{arrangement.bpm} bpm</Text>
        <Text style={[styles.meta, isSelected && styles.metaActive]}>{arrangement.key}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4DED1',
    borderRadius: 8,
    borderWidth: 1,
    gap: 9,
    marginRight: 10,
    minHeight: 154,
    padding: 13,
    width: 210,
  },
  cardActive: {
    backgroundColor: '#2E7D6E',
    borderColor: '#2E7D6E',
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#E8F2EE',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  iconWrapActive: {
    backgroundColor: '#245E53',
  },
  badge: {
    color: '#7A2E1E',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  badgeActive: {
    color: '#F2D98B',
  },
  title: {
    color: '#18201C',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 22,
  },
  titleActive: {
    color: '#F7F4EA',
  },
  artist: {
    color: '#68706B',
    fontSize: 13,
    fontWeight: '700',
  },
  artistActive: {
    color: '#D9E8E2',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 'auto',
  },
  meta: {
    backgroundColor: '#F2ECDD',
    borderRadius: 999,
    color: '#4D554F',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 5,
    textTransform: 'uppercase',
  },
  metaActive: {
    backgroundColor: '#245E53',
    color: '#F7F4EA',
  },
  pressed: {
    opacity: 0.76,
    transform: [{ translateY: 1 }],
  },
});
