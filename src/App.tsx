import React, { useState, useCallback } from 'react';
import './App.css';
import confetti from 'canvas-confetti';

type GameMode = 'choice' | 'input' | null;
type DisplayMode = 'silhouette' | 'illustration';
type ThemeType = 'light' | 'dark' | 'blue' | 'red' | 'pink' | 'green';

interface Pokemon {
  id: number;
  name: string;
  image: string;
}

const THEMES: { id: ThemeType; color: string; label: string }[] = [
  { id: 'light', color: '#ffffff', label: '標準' },
  { id: 'dark', color: '#111827', label: 'ダーク' },
  { id: 'blue', color: '#3b82f6', label: 'ブルー' },
  { id: 'red', color: '#ef4444', label: 'レッド' },
  { id: 'pink', color: '#ec4899', label: 'ピンク' },
  { id: 'green', color: '#10b981', label: 'グリーン' },
];

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
  const [displayMode, setDisplayMode] = useState<DisplayMode>('silhouette');
  const [theme, setTheme] = useState<ThemeType>(() => (localStorage.getItem('appTheme') as ThemeType) || 'light');
  const [currentPokemon, setCurrentPokemon] = useState<Pokemon | null>(null);
  const [previewPokemon, setPreviewPokemon] = useState<Pokemon | null>(null);
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

  // Apply theme to body
  React.useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('appTheme', theme);
  }, [theme]);

  // Load preview Pokemon on mount
  React.useEffect(() => {
    const loadPreview = async () => {
      try {
        const pokemon = await fetchRandomPokemon();
        setPreviewPokemon(pokemon);
      } catch (error) {
        console.error('Failed to load preview Pokemon', error);
      }
    };
    loadPreview();
  }, []);

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
        <div className="glass-panel fade-in" style={{ padding: '2.5rem', textAlign: 'center', width: '100%' }}>
          {previewPokemon && (
            <div style={{ marginBottom: '1.5rem' }}>
              <img 
                src={previewPokemon.image} 
                alt="Pokemon Preview" 
                style={{ width: '150px', height: '150px', objectFit: 'contain', opacity: 0.8 }} 
              />
            </div>
          )}
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            🎮 ポケモンクイズ
          </h1>
          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <div className="score-badge">
              🏆 ベスト: {bestScore}
            </div>
            <div className="score-badge">
              🔥 最大連勝: {maxStreak}
            </div>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600 }}>テーマを選択</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              {THEMES.map((t) => (
                <div 
                  key={t.id}
                  className={`theme-circle ${theme === t.id ? 'active' : ''}`}
                  style={{ backgroundColor: t.color, border: t.id === 'light' ? '1px solid #e5e7eb' : 'none' }}
                  onClick={() => setTheme(t.id)}
                  title={t.label}
                />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '2rem', justifyContent: 'center' }}>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>表示モード</p>
              <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', background: 'var(--bg-gray)', padding: '0.25rem', borderRadius: '8px' }}>
                <button 
                  onClick={() => setDisplayMode('silhouette')} 
                  style={{ 
                    padding: '0.5rem 1rem', 
                    fontSize: '0.875rem', 
                    background: displayMode === 'silhouette' ? 'var(--primary-color)' : 'transparent',
                    color: displayMode === 'silhouette' ? 'white' : 'var(--text-secondary)',
                    boxShadow: 'none',
                    borderRadius: '6px'
                  }}
                >
                  影
                </button>
                <button 
                  onClick={() => setDisplayMode('illustration')} 
                  style={{ 
                    padding: '0.5rem 1rem', 
                    fontSize: '0.875rem', 
                    background: displayMode === 'illustration' ? 'var(--primary-color)' : 'transparent',
                    color: displayMode === 'illustration' ? 'white' : 'var(--text-secondary)',
                    boxShadow: 'none',
                    borderRadius: '6px'
                  }}
                >
                  絵
                </button>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => startGame('choice')} style={{ padding: '1rem 2rem', fontSize: '1rem', background: 'var(--success)', color: 'white', flex: 1, minWidth: '140px' }}>
              🎯 選択肢
            </button>
            <button onClick={() => startGame('input')} style={{ padding: '1rem 2rem', fontSize: '1rem', background: 'var(--primary-color)', color: 'white', flex: 1, minWidth: '140px' }}>
              ⌨️ 入力
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
      <div className="glass-panel bounce-in" style={{ padding: '2rem', width: '100%', maxWidth: '600px', position: 'relative' }}>
        <button onClick={resetGame} style={{ position: 'absolute', top: '1rem', left: '1rem', padding: '0.5rem 0.875rem', fontSize: '0.875rem', background: '#f3f4f6', color: '#374151' }}>
          ← 戻る
        </button>
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', textAlign: 'right' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>スコア: <strong style={{ color: '#1f2937' }}>{score}</strong></div>
          <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#f59e0b' }}>
            {currentStreak > 0 && '🔥'}
            連勝: {currentStreak}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '2rem' }}>
          <img 
            src={currentPokemon.image} 
            alt="Pokemon" 
            className={displayMode === 'silhouette' && !showResult ? 'pokemon-silhouette' : 'pokemon-reveal'}
            style={{ width: '250px', height: '250px', objectFit: 'contain' }} 
          />
          <h3 style={{ marginTop: '1rem', fontSize: '1.25rem', fontWeight: 600, color: '#374151' }}>
            {displayMode === 'silhouette' ? 'ポケモン だーれだ？' : 'このポケモンの名前は？'}
          </h3>
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
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.1)', borderRadius: '16px' }}>
            <div className="glass-panel bounce-in" style={{ padding: '2rem', textAlign: 'center', background: isCorrect ? '#f0fdf4' : '#fef2f2', border: isCorrect ? '2px solid #10b981' : '2px solid #ef4444', width: '85%', maxWidth: '400px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                {isCorrect ? '🎉' : '😢'}
              </div>
              <h2 style={{ fontSize: '1.75rem', color: isCorrect ? '#10b981' : '#ef4444', marginBottom: '1rem', fontWeight: 700 }}>
                {isCorrect ? '正解！' : '残念...'}
              </h2>
              <p style={{ fontSize: '1.125rem', marginBottom: '1.5rem', color: '#374151', fontWeight: 500 }}>
                正解は <strong style={{ fontSize: '1.25rem' }}>{currentPokemon.name}</strong> です！
              </p>
              <button onClick={nextQuestion} style={{ background: '#1f2937', color: 'white', padding: '0.875rem 2rem', fontSize: '1rem', fontWeight: 600 }}>
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
