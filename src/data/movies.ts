import { Movie, Review, CastMember } from '../types/navigation';

export const FEATURED_MOVIES: Movie[] = [
  {
    id: '1',
    title: 'Jurassic World',
    year: 2021,
    duration: '148 Minutes',
    genre: 'Action',
    rating: 9.0,
    poster: 'https://picsum.photos/seed/jurassic/200/300',
    description:
      'A theme park of cloned dinosaurs turns deadly when the creatures break free and terrorize guests and staff.',
  },
  {
    id: '2',
    title: 'Spider-Man: No Way Home',
    year: 2021,
    duration: '148 Minutes',
    genre: 'Action',
    rating: 9.5,
    poster: 'https://picsum.photos/seed/spiderman/200/300',
    description:
      'With Spider-Man\'s identity now revealed, Peter asks Doctor Strange for help. When a spell goes wrong, villains from other worlds start to appear.',
  },
];

export const NOW_PLAYING: Movie[] = [
  ...FEATURED_MOVIES,
  {
    id: '3',
    title: 'Doctor Strange',
    year: 2022,
    duration: '126 Minutes',
    genre: 'Action',
    rating: 8.2,
    poster: 'https://picsum.photos/seed/doctorstrange/200/300',
    description: 'Doctor Strange teams up with a mysterious Avenger to face a powerful enemy.',
  },
  {
    id: '4',
    title: 'The Dungeons',
    year: 2023,
    duration: '134 Minutes',
    genre: 'Fantasy',
    rating: 7.8,
    poster: 'https://picsum.photos/seed/dungeons/200/300',
    description: 'A ragtag group of adventurers embarks on a daring heist.',
  },
];

export const MOVIE_REVIEWS: Review[] = [
  {
    id: 'r1',
    author: 'Iqbal Shafiq Rozaan',
    rating: 8.3,
    text: 'From DC Comics comes the Suicide Squad, an antihero team of incarcerated supervillains who act as deniable assets for the United States government.',
  },
  {
    id: 'r2',
    author: 'Iqbal Shafiq Rozaan',
    rating: 6.3,
    text: 'From DC Comics comes the Suicide Squad, an antihero team of incarcerated supervillains who act as deniable assets for the United States government.',
  },
];

export const MOVIE_CAST: CastMember[] = [
  { id: 'c1', name: 'Tom Holland', photo: 'https://picsum.photos/seed/tomholland/100/100' },
  { id: 'c2', name: 'Zendaya', photo: 'https://picsum.photos/seed/zendaya/100/100' },
  { id: 'c3', name: 'Benedict Cumberbatch', photo: 'https://picsum.photos/seed/benedict/100/100' },
  { id: 'c4', name: 'Brad Pitt', photo: 'https://picsum.photos/seed/bradpitt/100/100' },
];
