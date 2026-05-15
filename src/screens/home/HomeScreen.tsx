import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList, Movie } from '../../types/navigation';
import { NOW_PLAYING, FEATURED_MOVIES } from '../../data/movies';
import colors from '../../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>;
};

const CATEGORIES = ['Now playing', 'Upcoming', 'Top rated', 'Popular'];

export default function HomeScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.heading}>What do you want to watch?</Text>
        </View>

        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor={colors.placeholder}
            value={query}
            onChangeText={setQuery}
          />
          <Text style={styles.searchIcon}>🔍</Text>
        </View>

        <FlatList
          data={FEATURED_MOVIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.featuredList}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => navigation.navigate('Detail', { movie: item })}>
              <Image source={{ uri: item.poster }} style={styles.featuredPoster} />
            </TouchableOpacity>
          )}
        />

        <View style={styles.tabs}>
          {CATEGORIES.map((cat, i) => (
            <TouchableOpacity key={cat} onPress={() => setActiveTab(i)}>
              <Text style={[styles.tabText, i === activeTab && styles.tabActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={NOW_PLAYING}
          numColumns={3}
          scrollEnabled={false}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => navigation.navigate('Detail', { movie: item })}
            >
              <Image source={{ uri: item.poster }} style={styles.gridPoster} />
            </TouchableOpacity>
          )}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, marginBottom: 12 },
  heading: { color: colors.white, fontSize: 20, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  searchInput: { flex: 1, color: colors.white, paddingVertical: 10, fontSize: 14 },
  searchIcon: { fontSize: 16 },
  featuredList: { paddingHorizontal: 20, gap: 12, marginBottom: 16 },
  featuredPoster: { width: 140, height: 200, borderRadius: 12 },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 20, marginBottom: 16 },
  tabText: { color: colors.gray, fontSize: 13 },
  tabActive: { color: colors.primary, fontWeight: '700', borderBottomWidth: 2, borderBottomColor: colors.primary, paddingBottom: 2 },
  grid: { paddingHorizontal: 16 },
  gridItem: { flex: 1, margin: 4 },
  gridPoster: { width: '100%', aspectRatio: 0.67, borderRadius: 10 },
});
