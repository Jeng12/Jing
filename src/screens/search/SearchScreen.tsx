import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList, Movie } from '../../types/navigation';
import { NOW_PLAYING } from '../../data/movies';
import colors from '../../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>;
};

export default function SearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');

  const results = query.trim()
    ? NOW_PLAYING.filter(m => m.title.toLowerCase().includes(query.toLowerCase()))
    : [];

  const showEmpty = query.trim().length > 0 && results.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Search</Text>
        <TouchableOpacity style={styles.infoBtn}>
          <Text style={styles.infoIcon}>ⓘ</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor={colors.placeholder}
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
        <Text style={styles.searchIcon}>🔍</Text>
      </View>

      {showEmpty ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIllustration}>🔍</Text>
          <Text style={styles.emptyTitle}>We Are Sorry, We Can{'\n'}Not Find The Movie :(</Text>
          <Text style={styles.emptySubtitle}>
            Find your movie by Type title,{'\n'}categories, years, etc
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.resultsList}
          renderItem={({ item }: { item: Movie }) => (
            <TouchableOpacity
              style={styles.resultCard}
              onPress={() => navigation.navigate('Detail', { movie: item })}
            >
              <Image source={{ uri: item.poster }} style={styles.poster} />
              <View style={styles.info}>
                <Text style={styles.movieTitle}>{item.title}</Text>
                <Text style={styles.metaItem}>⭐ {item.rating}</Text>
                <Text style={styles.metaItem}>🎬 {item.genre}</Text>
                <Text style={styles.metaItem}>📅 {item.year}</Text>
                <Text style={styles.metaItem}>⏱ {item.duration}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: { color: colors.white, fontSize: 22, lineHeight: 26 },
  title: { flex: 1, color: colors.white, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  infoBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  infoIcon: { color: colors.gray, fontSize: 20 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  searchInput: { flex: 1, color: colors.white, paddingVertical: 12, fontSize: 14 },
  searchIcon: { fontSize: 16 },
  resultsList: { paddingHorizontal: 20 },
  resultCard: { flexDirection: 'row', marginBottom: 20, gap: 16 },
  poster: { width: 90, height: 130, borderRadius: 10 },
  info: { flex: 1, justifyContent: 'center', gap: 6 },
  movieTitle: { color: colors.white, fontSize: 16, fontWeight: '700' },
  metaItem: { color: colors.gray, fontSize: 13 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIllustration: { fontSize: 72, marginBottom: 8 },
  emptyTitle: { color: colors.white, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { color: colors.gray, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
