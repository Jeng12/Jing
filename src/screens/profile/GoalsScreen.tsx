import React, { useState } from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppScreenProps } from '../../types/navigation';
import { useTracker } from '../../store/TrackerContext';
import AuthButton from '../../components/AuthButton';
import ScreenHeader from '../../components/ScreenHeader';
import Stepper from '../../components/Stepper';
import colors from '../../theme/colors';

type Props = AppScreenProps<'Goals'>;

export default function GoalsScreen({ navigation }: Props) {
  const { data, updateGoals } = useTracker();
  const [goals, setGoals] = useState(data.goals);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Daily Goals" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>Your rings and scores on Today are measured against these.</Text>
        <Stepper label="👟 Steps" unit="steps a day" value={goals.steps} step={500} min={500} max={50000} onChange={steps => setGoals({ ...goals, steps })} format={v => v.toLocaleString()} />
        <Stepper label="🔥 Exercise" unit="minutes a day" value={goals.exerciseMinutes} step={5} min={5} max={300} onChange={exerciseMinutes => setGoals({ ...goals, exerciseMinutes })} />
        <Stepper label="🌙 Sleep" unit="hours a night" value={goals.sleepHours} step={0.5} min={4} max={12} onChange={sleepHours => setGoals({ ...goals, sleepHours })} />
        <Stepper label="💧 Water" unit="glasses a day" value={goals.waterGlasses} step={1} min={1} max={20} onChange={waterGlasses => setGoals({ ...goals, waterGlasses })} />
        <Stepper label="📚 Learning" unit="minutes a day" value={goals.learningMinutes} step={5} min={5} max={480} onChange={learningMinutes => setGoals({ ...goals, learningMinutes })} />
        <Text style={styles.group}>Heart rate</Text>
        <Stepper label="❤️ Max heart rate" unit="bpm · about 220 minus your age" value={goals.maxHeartRate} step={1} min={120} max={220} onChange={maxHeartRate => setGoals({ ...goals, maxHeartRate })} />
        <AuthButton
          title="Save goals"
          onPress={() => {
            updateGoals(goals);
            navigation.goBack();
          }}
          style={styles.save}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24 },
  hint: { color: colors.gray, fontSize: 13, marginBottom: 16 },
  group: { color: colors.gray, fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 10 },
  save: { marginTop: 16 },
});
