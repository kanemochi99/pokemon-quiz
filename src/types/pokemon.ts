export interface Pokemon {
  id: number;
  name: string; // The official name (Japanese)
  image: string;
}

export interface QuizQuestion {
  correctPokemon: Pokemon;
  choices: string[]; // List of names for multiple choice
}

export type GameMode = 'choice' | 'input' | null;

export interface GameState {
  currentPokemon: Pokemon | null;
  choices: string[]; // For choice mode
  score: number;
  totalQuestions: number;
  isCorrect: boolean | null; // null = unanswered, true = correct, false = wrong
  isLoading: boolean;
  gameMode: GameMode;
  showResult: boolean;
}
