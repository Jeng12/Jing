import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import IconBadge from './IconBadge';
import type { IconName } from '../utils/metrics';
import colors from '../theme/colors';

interface Props {
  icon: IconName;
  color: string;
  label: string;
  value: string;
  change: number | null;
  /** For measures where a rise is not simply "better" (resting heart rate): no green/red. */
  neutral?: boolean;
}

export default function TrendCard({ icon, color, label, value, change, neutral }: Props) {
  const flat = change === null || change === 0;
  const tone = neutral || flat ? styles.flat : change > 0 ? styles.up : styles.down;
  const text = change === null ? 'No data last week' : change === 0 ? 'Same as last week' : `${Math.abs(change)}% vs last week`;
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <IconBadge name={icon} color={color} size={26} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      <View style={styles.changeRow}>
        {!flat && <Ionicons name={change > 0 ? 'arrow-up' : 'arrow-down'} size={12} style={tone} />}
        <Text style={[styles.change, tone]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.card, borderRadius: 18, padding: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: colors.gray, fontSize: 13 },
  value: { color: colors.white, fontSize: 20, fontWeight: '700', marginVertical: 8 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  change: { fontSize: 12, fontWeight: '600' },
  up: { color: colors.success },
  down: { color: colors.danger },
  flat: { color: colors.gray },
});
