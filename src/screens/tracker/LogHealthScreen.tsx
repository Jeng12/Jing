import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TrackerStackParamList } from '../../types/navigation';
import { useTracker } from '../../store/TrackerContext';
import { watchDay } from '../../utils/trackerStats';
import AuthButton from '../../components/AuthButton';
import ScreenHeader from '../../components/ScreenHeader';
import Stepper from '../../components/Stepper';
import colors from '../../theme/colors';

type Props = { navigation: NativeStackNavigationProp<TrackerStackParamList, 'LogHealth'> };

const MOODS = ['😞', '😕', '😐', '🙂', '😄'];

export default function LogHealthScreen({ navigation }: Props) {
  const { data, healthFor, saveHealth } = useTracker();
  const [log, setLog] = useState(() => healthFor());
  const watch = watchDay(data, log.date);
  const watchHint = (value: number | undefined, unit: string, manual: number) =>
    value ? ` · ⌚ ${value} ${unit}${'\n'}${manual ? 'replaced by your entry' : 'used until you enter a value'}` : '';

  const save = () => {
    saveHealth(log);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Log Health" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>Today's totals — update them any time during the day.</Text>
        <Stepper
          label="💧 Water"
          unit="glasses"
          value={log.waterGlasses}
          step={1}
          max={30}
          onChange={waterGlasses => setLog({ ...log, waterGlasses })}
        />
        <Stepper
          label="😴 Sleep"
          unit={`hours last night${watchHint(watch?.sleepHours, 'h', log.sleepHours)}`}
          value={log.sleepHours}
          step={0.5}
          max={24}
          onChange={sleepHours => setLog({ ...log, sleepHours })}
        />
        <Stepper
          label="🏃 Exercise"
          unit={`minutes${watchHint(watch?.exerciseMinutes, 'min', log.exerciseMinutes)}`}
          value={log.exerciseMinutes}
          step={5}
          max={600}
          onChange={exerciseMinutes => setLog({ ...log, exerciseMinutes })}
        />

        <Text style={styles.moodTitle}>How do you feel?</Text>
        <View style={styles.moods}>
          {MOODS.map((emoji, i) => (
            <TouchableOpacity
              key={emoji}
              style={[styles.mood, log.mood === i + 1 && styles.moodActive]}
              onPress={() => setLog({ ...log, mood: i + 1 })}
              accessibilityLabel={`Mood ${i + 1} of 5`}
            >
              <Text style={styles.moodEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <AuthButton title="Save" onPress={save} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24 },
  hint: { color: colors.gray, fontSize: 13, marginBottom: 16 },
  moodTitle: { color: colors.white, fontSize: 15, fontWeight: '600', marginTop: 12, marginBottom: 12 },
  moods: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  mood: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodActive: { borderColor: colors.primary },
  moodEmoji: { fontSize: 26 },
});
