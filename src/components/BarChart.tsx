import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';

interface Props {
  values: (number | null)[];
  labels: string[];
  color: string;
  goal?: number | null;
  height?: number;
  /** Index drawn at full color; others are dimmed. */
  highlight?: number;
  format?: (value: number) => string;
}

export default function BarChart({ values, labels, color, goal, height = 140, highlight, format }: Props) {
  const max = Math.max(goal ?? 0, ...values.map(v => v ?? 0), 1) * 1.1;
  const goalTop = goal ? height - (goal / max) * height : null;
  return (
    <View>
      <View style={[styles.plot, { height }]}>
        {goalTop !== null && (
          <View style={[styles.goalLine, { top: goalTop }]}>
            <Text style={styles.goalText}>Goal</Text>
          </View>
        )}
        {values.map((v, i) => (
          <View key={i} style={styles.col}>
            {v !== null && <Text style={styles.value}>{format ? format(v) : Math.round(v)}</Text>}
            <View
              style={[
                styles.bar,
                {
                  height: v ? Math.max(4, (v / max) * height) : 4,
                  backgroundColor: v ? color : colors.ringTrack,
                  opacity: highlight === undefined || highlight === i ? 1 : 0.55,
                },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.labels}>
        {labels.map((l, i) => (
          <Text key={i} style={[styles.label, highlight === i && styles.labelActive]}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', alignItems: 'flex-end' },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '52%', maxWidth: 26, borderRadius: 6 },
  value: { color: colors.gray, fontSize: 10, marginBottom: 4 },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.gray,
  },
  goalText: { position: 'absolute', right: 0, top: -16, color: colors.gray, fontSize: 10 },
  labels: { flexDirection: 'row', marginTop: 8 },
  label: { flex: 1, textAlign: 'center', color: colors.gray, fontSize: 12 },
  labelActive: { color: colors.white, fontWeight: '700' },
});
