import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppScreenProps } from '../../types/navigation';
import { CoachReport } from '../../types/tracker';
import { useTracker } from '../../store/TrackerContext';
import { useSession } from '../../store/SessionContext';
import { clearApiKey, getApiKey, setApiKey } from '../../services/apiKeyStore';
import { ChatTurn, describeClaudeError } from '../../services/claude';
import { analyzeRecent, askCoach, questionOnly } from '../../services/coach';
import { timeAgo } from '../../utils/trackerStats';
import AuthButton from '../../components/AuthButton';
import AuthInput from '../../components/AuthInput';
import ScreenHeader from '../../components/ScreenHeader';
import CoachReportView from '../../components/CoachReportView';
import colors from '../../theme/colors';

type Props = AppScreenProps<'Coach'>;

const REPORT_KEY = 'jing.coach.v1';
const SUGGESTIONS = ['What should I focus on this week?', 'How is my sleep affecting my workouts?', 'Am I learning enough?'];

export default function CoachScreen({ navigation }: Props) {
  const { data } = useTracker();
  const { profile } = useSession();
  const [apiKey, setKey] = useState<string | null | undefined>(undefined);
  const [keyInput, setKeyInput] = useState('');
  const [report, setReport] = useState<CoachReport | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    getApiKey().then(setKey);
    AsyncStorage.getItem(REPORT_KEY)
      .then(raw => raw && setReport(JSON.parse(raw)))
      .catch(() => undefined);
  }, []);

  const saveKey = async () => {
    const value = keyInput.trim();
    if (!value.startsWith('sk-ant-')) return setError('That does not look like an Anthropic API key (it starts with sk-ant-).');
    await setApiKey(value);
    setKey(value);
    setKeyInput('');
    setError('');
  };

  const removeKey = async () => {
    await clearApiKey();
    setKey(null);
  };

  const analyze = async () => {
    if (!apiKey) return;
    setAnalyzing(true);
    setError('');
    try {
      const result = await analyzeRecent(apiKey, data, profile.name);
      setReport(result);
      AsyncStorage.setItem(REPORT_KEY, JSON.stringify(result)).catch(() => undefined);
    } catch (e) {
      setError(describeClaudeError(e));
    } finally {
      setAnalyzing(false);
    }
  };

  const ask = async (text: string) => {
    const q = text.trim();
    if (!apiKey || !q || asking) return;
    setAsking(true);
    setError('');
    setQuestion('');
    setHistory([...history, { role: 'user', content: q }]);
    try {
      // The stored turn keeps the data block, so follow-up questions have the context.
      const { answer, userTurn } = await askCoach(apiKey, history, q, data, profile.name);
      setHistory([...history, userTurn, { role: 'assistant', content: answer }]);
    } catch (e) {
      setHistory(history);
      setQuestion(q);
      setError(describeClaudeError(e));
    } finally {
      setAsking(false);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  if (apiKey === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="AI Coach" onBack={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="AI Coach" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!apiKey ? (
            <View style={styles.card}>
              <Ionicons name="sparkles" size={32} color={colors.primary} />
              <Text style={styles.cardTitle}>Analyse your data with Claude</Text>
              <Text style={styles.body}>
                The AI Coach reads your last 14 days of health, workouts and learning, then points out what is going well
                and what to try next. You can also ask it questions.
              </Text>
              <Text style={styles.body}>
                It uses your own Anthropic API key. Create one at console.anthropic.com → API keys, then paste it here. Each
                analysis costs a few cents on your Anthropic account.
              </Text>
              <AuthInput
                label="Anthropic API key"
                placeholder="sk-ant-…"
                value={keyInput}
                onChangeText={setKeyInput}
                autoCapitalize="none"
                autoCorrect={false}
                secureToggle
              />
              <AuthButton title="Save key" onPress={saveKey} />
              <Text style={styles.privacy}>
                Your key is stored encrypted on this phone. When you run an analysis, a summary of your recent data is sent
                to Anthropic to generate it. Nothing is sent until you tap Analyse or Ask.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>Your last 2 weeks</Text>
                {report && <Text style={styles.meta}>Updated {timeAgo(report.generatedAt)}</Text>}
              </View>

              {analyzing ? (
                <View style={[styles.card, styles.center]}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.body}>Claude is reading your data… this can take up to a minute.</Text>
                </View>
              ) : report ? (
                <CoachReportView report={report} />
              ) : (
                <Text style={styles.body}>No analysis yet. Tap the button below to get your first one.</Text>
              )}

              <AuthButton
                title={analyzing ? 'Analysing…' : report ? 'Analyse again' : 'Analyse my last 2 weeks'}
                onPress={analyzing ? () => undefined : analyze}
                style={styles.analyzeBtn}
              />

              <Text style={[styles.sectionTitle, styles.askTitle]}>Ask the coach</Text>
              {history.length === 0 && (
                <View style={styles.chips}>
                  {SUGGESTIONS.map(s => (
                    <TouchableOpacity key={s} style={styles.chip} onPress={() => ask(s)}>
                      <Text style={styles.chipText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {history.map((turn, i) => (
                <View key={i} style={[styles.bubble, turn.role === 'user' ? styles.userBubble : styles.coachBubble]}>
                  <Text style={turn.role === 'user' ? styles.userText : styles.coachText}>
                    {turn.role === 'user' ? questionOnly(turn) : turn.content}
                  </Text>
                </View>
              ))}
              {asking && (
                <View style={[styles.bubble, styles.coachBubble]}>
                  <ActivityIndicator color={colors.primary} size="small" />
                </View>
              )}
            </>
          )}
          {!!error && <Text style={styles.error}>{error}</Text>}
          {apiKey && (
            <TouchableOpacity style={styles.removeKey} onPress={removeKey}>
              <Text style={styles.removeKeyText}>Remove API key from this phone</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {apiKey && (
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Ask about your sleep, workouts, learning…"
              placeholderTextColor={colors.placeholder}
              value={question}
              onChangeText={setQuestion}
              onSubmitEditing={() => ask(question)}
              returnKeyType="send"
              editable={!asking}
            />
            <TouchableOpacity
              style={[styles.send, (!question.trim() || asking) && styles.sendDisabled]}
              onPress={() => ask(question)}
              accessibilityLabel="Send question"
            >
              <Ionicons name="arrow-up" size={20} color={colors.background} />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 24 },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 18, gap: 12, marginBottom: 14 },
  center: { alignItems: 'center' },
  cardTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  body: { color: colors.gray, fontSize: 14, lineHeight: 21 },
  privacy: { color: colors.gray, fontSize: 12, lineHeight: 18 },
  rowBetween: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: colors.white, fontSize: 17, fontWeight: '700' },
  meta: { color: colors.gray, fontSize: 12 },
  analyzeBtn: { marginTop: 14 },
  askTitle: { marginTop: 28, marginBottom: 12 },
  chips: { gap: 8, marginBottom: 8 },
  chip: { alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { color: colors.white, fontSize: 13 },
  bubble: { borderRadius: 16, padding: 12, marginBottom: 8, maxWidth: '88%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  coachBubble: { alignSelf: 'flex-start', backgroundColor: colors.card },
  userText: { color: colors.background, fontSize: 14, lineHeight: 20 },
  coachText: { color: colors.white, fontSize: 14, lineHeight: 21 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginTop: 12, textAlign: 'center' },
  removeKey: { alignItems: 'center', paddingVertical: 18 },
  removeKeyText: { color: colors.gray, fontSize: 12, textDecorationLine: 'underline' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.inputBorder,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.white,
    fontSize: 15,
  },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.4 },
});
