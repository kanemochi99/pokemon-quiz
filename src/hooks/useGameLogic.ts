import { useState, useCallback, useEffect } from 'react';
import { GameMode, GameState, QuizQuestion } from '../types/pokemon';
import { fetchQuizData } from '../services/pokeapi';
// import confetti from 'canvas-confetti';

const TOTAL_QUESTIONS = 5; // Fixed number of questions per game

export const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameState>({
    currentPokemon: null,
    choices: [],
    score: 0,
    totalQuestions: 0,
    isCorrect: null,
    isLoading: false,
    gameMode: null,
    showResult: false,
  });

  const loadQuestion = useCallback(async () => {
    setGameState((prev) => ({ ...prev, isLoading: true, isCorrect: null, showResult: false }));
    try {
      const data: QuizQuestion = await fetchQuizData();
      setGameState((prev) => ({
        ...prev,
        currentPokemon: data.correctPokemon,
        choices: data.choices,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to load question', error);
      setGameState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const startGame = useCallback((mode: GameMode) => {
    setGameState({
      currentPokemon: null,
      choices: [],
      score: 0,
      totalQuestions: 0,
      isCorrect: null,
      isLoading: true,
      gameMode: mode,
      showResult: false,
    });
    loadQuestion();
  }, [loadQuestion]);

  const checkAnswer = useCallback((answer: string) => {
    setGameState((prev) => {
      if (!prev.currentPokemon) return prev;

      const isCorrect = prev.currentPokemon.name === answer;
      const newScore = isCorrect ? prev.score + 1 : prev.score;

      if (isCorrect) {
        // confetti({
        //   particleCount: 100,
        //   spread: 70,
        //   origin: { y: 0.6 },
        //   colors: ['#FFD700', '#FF4500', '#008080'],
        // });
      }

      return {
        ...prev,
        isCorrect,
        score: newScore,
        totalQuestions: prev.totalQuestions + 1,
        showResult: true, // Show feedback immediately
      };
    });
  }, []);

  const nextQuestion = useCallback(() => {
    // Check if game should end? For now infinite loops or we can add a limit.
    // Let's stick to infinite for simplicity or checking score periodically?
    // Implementation Plan said "Result/Feedback".
    // Let's just load next question.
    loadQuestion();
  }, [loadQuestion]);

  const resetGame = useCallback(() => {
    setGameState((prev) => ({ ...prev, gameMode: null }));
  }, []);

  return {
    gameState,
    startGame,
    checkAnswer,
    nextQuestion,
    resetGame,
  };
};
