import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { IconName } from '../utils/metrics';

interface Props {
  name: IconName;
  color: string;
  size?: number;
}

/** A metric icon on a tinted circle. */
export default function IconBadge({ name, color, size = 32 }: Props) {
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: `${color}26` }]}>
      <Ionicons name={name} size={size * 0.55} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
});
