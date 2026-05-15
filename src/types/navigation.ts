export type AuthStackParamList = {
  Root: undefined;
  Login: undefined;
  SignUp: undefined;
  Verification: { email: string };
  ResetPassword: undefined;
  CreateNewPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  WatchList: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  Detail: { movie: Movie };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
};

export interface Movie {
  id: string;
  title: string;
  year: number;
  duration: string;
  genre: string;
  rating: number;
  poster: string;
  description: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
}

export interface CastMember {
  id: string;
  name: string;
  photo: string;
}
