import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type SegmentedOption<T extends string> = {
  label: string;
  value: T;
  icon?: keyof typeof Ionicons.glyphMap;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  compact?: boolean;
  testIDPrefix?: string;
};

export function SegmentedControl<T extends string>({
  compact = false,
  onChange,
  options,
  testIDPrefix,
  value,
}: SegmentedControlProps<T>) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {options.map((option) => {
        const active = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              compact && styles.optionCompact,
              active && styles.optionActive,
              pressed && styles.pressed,
            ]}
            testID={testIDPrefix ? `${testIDPrefix}-${option.value}` : undefined}
          >
            {option.icon ? (
              <Ionicons color={active ? '#F7F4EA' : '#425049'} name={option.icon} size={compact ? 14 : 17} />
            ) : null}
            <Text style={[styles.label, compact && styles.labelCompact, active && styles.labelActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#EBE6DA',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  wrapCompact: {
    alignSelf: 'flex-start',
    flexShrink: 1,
    padding: 3,
  },
  option: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 10,
  },
  optionCompact: {
    flex: 0,
    minHeight: 32,
    paddingHorizontal: 9,
  },
  optionActive: {
    backgroundColor: '#18201C',
  },
  label: {
    color: '#425049',
    fontSize: 14,
    fontWeight: '900',
  },
  labelCompact: {
    fontSize: 11,
  },
  labelActive: {
    color: '#F7F4EA',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ translateY: 1 }],
  },
});
