import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../theme/colors';

export default function AuthInput({ label, secureToggle, ...props }) {
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={secureToggle ? hidden : false}
          {...props}
        />
        {secureToggle && (
          <TouchableOpacity onPress={() => setHidden(h => !h)} style={styles.eyeBtn}>
            <Text style={styles.eyeIcon}>{hidden ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { color: colors.white, marginBottom: 6, fontSize: 14 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  input: {
    flex: 1,
    color: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  eyeBtn: { paddingHorizontal: 14 },
  eyeIcon: { fontSize: 16 },
});
