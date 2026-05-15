import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import colors from '../theme/colors';

interface Props {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
}

export default function AuthButton({ title, onPress, style }: Props) {
  return (
    <TouchableOpacity style={[styles.btn, style]} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  text: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
