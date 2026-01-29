import React, { useState, useCallback } from 'react';
import './App.css';

type GameMode = 'choice' | 'input' | null;

interface Pokemon {
  id: number;
  name: string;
  image: string;
}

const MAX_POKEMON_ID = 1025;

const getRandomId = () => Math.floor(Math.random() * MAX_POKEMON_ID) + 1;

const fetchPokemonName = async (id: number): Promise<string> => {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
  const data = await response.json();
  const jaName = data.names.find((n: any) => n.language.name === 'ja')?.name;
  return jaName || 'Unknown Pokemon';
};

const fetchPokemonImage = async (id: number): Promise<string> => {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  const data = await response.json();
  return data.sprites.other['official-artwork'].front_default;
};

const fetchRandomPokemon = async (): Promise<Pokemon> => {
  const id = getRandomId();
  const [name, image] = await Promise.all([
    fetchPokemonName(id),
    fetchPokemonImage(id),
  ]);
  return { id, name, image };
};

const fetchQuizData = async () => {
  const correctPokemon = await fetchRandomPokemon();
  const wrongPromises = [];
  while (wrongPromises.length < 3) {
    const id = getRandomId();
    if (id !== correctPokemon.id) {
      wrongPromises.push(fetchPokemonName(id));
    }
  }
  const wrongNames = await Promise.all(wrongPromises);
  const choices = [...wrongNames, correctPokemon.name].sort(() => Math.random() - 0.5);
  return { correctPokemon, choices };
};

function App() {
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [currentPokemon, setCurrentPokemon] = useState<Pokemon | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const loadQuestion = useCallback(async () => {
    setIsLoading(true);
    setIsCorrect(null);
    setShowResult(false);
    setInputValue('');
    try {
      const data = await fetchQuizData();
      setCurrentPokemon(data.correctPokemon);
      setChoices(data.choices);
    } catch (error) {
      console.error('Failed to load question', error);
    }
    setIsLoading(false);
  }, []);

  const startGame = useCallback((mode: GameMode) => {
    setGameMode(mode);
    setScore(0);
    setTotalQuestions(0);
    loadQuestion();
  }, [loadQuestion]);

  const checkAnswer = useCallback((answer: string) => {
    if (!currentPokemon) return;
    const correct = currentPokemon.name === answer;
    setIsCorrect(correct);
    if (correct) setScore(score + 1);
    setTotalQuestions(totalQuestions + 1);
    setShowResult(true);
  }, [currentPokemon, score, totalQuestions]);

  const nextQuestion = useCallback(() => {
    loadQuestion();
  }, [loadQuestion]);

  const resetGame = useCallback(() => {
    setGameMode(null);
  }, []);

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      checkAnswer(inputValue.trim());
    }
  };

  // Start Screen
  if (!gameMode) {
    return (
      <div className="app-container">
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', background: 'linear-gradient(45deg, #FFD700, #FF4500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ポケモンクイズ
          </h1>
          <p style={{ marginBottom: '2rem', fontSize: '1.2rem', opacity: 0.8 }}>
            モードを選んでスタート！
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => startGame('choice')} style={{ padding: '1rem 2rem', fontSize: '1.1rem', background: '#4CAF50', color: 'white' }}>
              選択肢モード
            </button>
            <button onClick={() => startGame('input')} style={{ padding: '1rem 2rem', fontSize: '1.1rem', background: '#2196F3', color: 'white' }}>
              入力モード
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading Screen
  if (isLoading && !currentPokemon) {
    return (
      <div className="app-container">
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  // Quiz Screen
  if (!currentPokemon) return null;

  return (
    <div className="app-container">
      <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '600px', position: 'relative' }}>
        <button onClick={resetGame} style={{ position: 'absolute', top: '1rem', left: '1rem', padding: '0.5rem', fontSize: '0.8rem' }}>
          戻る
        </button>
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '1rem', fontWeight: 'bold' }}>
          スコア: {score} / {totalQuestions}
        </div>
        <div style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '1rem' }}>
          <img src={currentPokemon.image} alt="Pokemon" style={{ width: '250px', height: '250px', objectFit: 'contain', filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.2))' }} />
          <h3 style={{ marginTop: '1rem', opacity: 0.6 }}>このポケモンの名前は？</h3>
        </div>

        {gameMode === 'choice' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', marginTop: '1rem' }}>
            {choices.map((choice, index) => (
              <button key={`${choice}-${index}`} onClick={() => checkAnswer(choice)} disabled={showResult} style={{ padding: '1rem', fontSize: '1rem', background: 'rgba(255, 255, 255, 0.8)', color: '#333', border: '1px solid #ddd', cursor: showResult ? 'not-allowed' : 'pointer' }}>
                {choice}
              </button>
            ))}
          </div>
        )}

        {gameMode === 'input' && (
          <form onSubmit={handleInputSubmit} style={{ width: '100%', marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={showResult} placeholder="ポケモンの名前を入力..." style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', background: 'rgba(255, 255, 255, 0.9)' }} autoFocus />
            <button type="submit" disabled={showResult || !inputValue.trim()} style={{ background: '#646cff', color: 'white', minWidth: '80px' }}>
              回答
            </button>
          </form>
        )}

        {showResult && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '16px' }}>
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', background: isCorrect ? 'rgba(220, 255, 220, 0.95)' : 'rgba(255, 220, 220, 0.95)', border: isCorrect ? '2px solid #4CAF50' : '2px solid #F44336', width: '80%', maxWidth: '400px' }}>
              <h2 style={{ fontSize: '2rem', color: isCorrect ? '#2E7D32' : '#C62828', marginBottom: '1rem' }}>
                {isCorrect ? '正解！' : '残念...'}
              </h2>
              <p style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>
                正解は <strong>{currentPokemon.name}</strong> です！
              </p>
              <button onClick={nextQuestion} style={{ background: '#1a1a1a', color: 'white', padding: '1rem 2rem', fontSize: '1.1rem' }}>
                次の問題へ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
