import React, { useState, useCallback } from 'react';
import './App.css';
import confetti from 'canvas-confetti';

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
  
  // High score and streak
  const [bestScore, setBestScore] = useState(() => Number(localStorage.getItem('bestScore')) || 0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(() => Number(localStorage.getItem('maxStreak')) || 0);

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
    setCurrentStreak(0);
    loadQuestion();
  }, [loadQuestion]);

  const checkAnswer = useCallback((answer: string) => {
    if (!currentPokemon) return;
    const correct = currentPokemon.name === answer;
    setIsCorrect(correct);
    
    if (correct) {
      // Confetti celebration!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FF4500', '#FF69B4', '#00CED1']
      });
      
      const newScore = score + 1;
      setScore(newScore);
      if (newScore > bestScore) {
        setBestScore(newScore);
        localStorage.setItem('bestScore', String(newScore));
        // Extra confetti for new record!
        setTimeout(() => {
          confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.5 }
          });
        }, 200);
      }
      
      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      if (newStreak > maxStreak) {
        setMaxStreak(newStreak);
        localStorage.setItem('maxStreak', String(newStreak));
      }
    } else {
      setCurrentStreak(0);
    }
    
    setTotalQuestions(totalQuestions + 1);
    setShowResult(true);
  }, [currentPokemon, score, bestScore, currentStreak, maxStreak, totalQuestions]);

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
        <div className="glass-panel fade-in" style={{ padding: '3rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem', background: 'linear-gradient(135deg, #FFD700, #FF6B6B, #4ECDC4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 4px 8px rgba(0,0,0,0.2)' }}>
            🎮 ポケモンクイズ
          </h1>
          <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <div className="score-badge">
              🏆 ベスト: {bestScore}
            </div>
            <div className="score-badge">
              <span className="streak-fire">🔥</span> 最大連勝: {maxStreak}
            </div>
          </div>
          <p style={{ marginBottom: '2.5rem', fontSize: '1.2rem', opacity: 0.9, fontWeight: 500 }}>
            モードを選んでスタート！
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => startGame('choice')} style={{ padding: '1.2rem 2.5rem', fontSize: '1.2rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontWeight: 700 }}>
              🎯 選択肢モード
            </button>
            <button onClick={() => startGame('input')} style={{ padding: '1.2rem 2.5rem', fontSize: '1.2rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', fontWeight: 700 }}>
              ⌨️ 入力モード
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
      <div className="glass-panel bounce-in" style={{ padding: '2rem', width: '100%', maxWidth: '650px', position: 'relative' }}>
        <button onClick={resetGame} style={{ position: 'absolute', top: '1rem', left: '1rem', padding: '0.6rem 1rem', fontSize: '0.9rem', background: 'rgba(255,255,255,0.2)', color: 'white' }}>
          ← 戻る
        </button>
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', textAlign: 'right' }}>
          <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.3rem' }}>スコア: <strong>{score}</strong></div>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#FFD700' }}>
            {currentStreak > 0 && <span className="streak-fire">🔥</span>}
            連勝: {currentStreak}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '2rem' }}>
          <img 
            src={currentPokemon.image} 
            alt="Pokemon" 
            className={showResult ? 'pokemon-reveal' : 'pokemon-silhouette'}
            style={{ width: '280px', height: '280px', objectFit: 'contain' }} 
          />
          <h3 style={{ marginTop: '1.5rem', fontSize: '1.5rem', fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>ポケモン だーれだ？</h3>
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
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '24px', backdropFilter: 'blur(5px)' }}>
            <div className="glass-panel bounce-in" style={{ padding: '2.5rem', textAlign: 'center', background: isCorrect ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95))', border: 'none', width: '85%', maxWidth: '450px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                {isCorrect ? '🎉' : '😢'}
              </div>
              <h2 style={{ fontSize: '2.5rem', color: 'white', marginBottom: '1.5rem', fontWeight: 900, textShadow: '0 4px 8px rgba(0,0,0,0.3)' }}>
                {isCorrect ? '正解！' : '残念...'}
              </h2>
              <p style={{ fontSize: '1.3rem', marginBottom: '2rem', color: 'white', fontWeight: 600 }}>
                正解は <strong style={{ fontSize: '1.5rem', textDecoration: 'underline' }}>{currentPokemon.name}</strong> です！
              </p>
              <button onClick={nextQuestion} style={{ background: 'rgba(0,0,0,0.3)', color: 'white', padding: '1.2rem 2.5rem', fontSize: '1.2rem', fontWeight: 700, border: '2px solid rgba(255,255,255,0.5)' }}>
                次の問題へ →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
