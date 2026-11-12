import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../theme/colors';

interface Props {
  label: string;
  value: number;
  unit: string;
  step: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}

export default function Stepper({ label, value, unit, step, min = 0, max, onChange, format }: Props) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, Math.round(next * 100) / 100)));
  return (
    <View style={styles.row}>
      <View style={styles.labelCol}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
      <TouchableOpacity style={styles.btn} onPress={() => set(value - step)} accessibilityLabel={`Decrease ${label}`}>
        <Text style={styles.btnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.value}>{format ? format(value) : value}</Text>
      <TouchableOpacity style={styles.btn} onPress={() => set(value + step)} accessibilityLabel={`Increase ${label}`}>
        <Text style={styles.btnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  labelCol: { flex: 1 },
  label: { color: colors.white, fontSize: 15, fontWeight: '600' },
  unit: { color: colors.gray, fontSize: 12, marginTop: 2 },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: colors.primary, fontSize: 22, lineHeight: 26 },
  value: { color: colors.white, fontSize: 18, fontWeight: '700', width: 64, textAlign: 'center' },
});
