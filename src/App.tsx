import React, { useState, useCallback } from 'react';
import './App.css';
import confetti from 'canvas-confetti';

type GameMode = 'choice' | 'input' | null;
type DisplayMode = 'illustration' | 'silhouette' | 'cry';
type ThemeType = 'light' | 'dark' | 'blue' | 'red' | 'pink' | 'green';

interface Pokemon {
  id: number;
  name: string;
  image: string;
  shinyImage?: string;
  isShiny?: boolean;
  cry?: string;
  flavorText?: string;
  types?: string[];
  genus?: string;
}

const TYPE_NAME_MAP: Record<string, string> = {
  normal: 'ノーマル', fire: 'ほのお', water: 'みず', grass: 'くさ', electric: 'でんき', ice: 'こおり',
  fighting: 'かくとう', poison: 'どく', ground: 'じめん', flying: 'ひこう', psychic: 'エスパー',
  bug: 'むし', rock: 'いわ', ghost: 'ゴースト', dragon: 'ドラゴン', steel: 'はがね', dark: 'あく', fairy: 'フェアリー'
};

const THEMES: { id: ThemeType; color: string; label: string }[] = [
  { id: 'light', color: '#ffffff', label: 'しろ' },
  { id: 'dark', color: '#111827', label: 'くろ' },
  { id: 'blue', color: '#3b82f6', label: 'あお' },
  { id: 'red', color: '#ef4444', label: 'あか' },
  { id: 'pink', color: '#ec4899', label: 'ピンク' },
  { id: 'green', color: '#10b981', label: 'みどり' },
];

const MAX_POKEMON_ID = 1010;
const SHINY_RATE = 0.05;

const GEN_RANGES: Record<string, [number, number]> = {
  '1': [1, 151],
  '2': [152, 251],
  '3': [252, 386],
  '4': [387, 493],
  '5': [494, 649],
  '6': [650, 721],
  '7': [722, 809],
  '8': [810, 905],
  '9': [906, 1010],
  'all': [1, 1010]
};

const REGION_NAME_MAP: Record<string, string> = {
  '1': 'カントー',
  '2': 'ジョウト',
  '3': 'ホウエン',
  '4': 'シンオウ',
  '5': 'イッシュ',
  '6': 'カロス',
  '7': 'アローラ',
  '8': 'ガラル',
  '9': 'パルデア',
  'all': 'すべて'
};

const getRandomId = (min = 1, max = MAX_POKEMON_ID) => 
  Math.floor(Math.random() * (max - min + 1)) + min;

const fetchPokemonData = async (id: number, forceShiny: boolean = false): Promise<Pokemon> => {
  const [resPokemon, resSpecies] = await Promise.all([
    fetch(`https://pokeapi.co/api/v2/pokemon/${id}`),
    fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`)
  ]);
  
  const [data, speciesData] = await Promise.all([
    resPokemon.json(),
    resSpecies.json()
  ]);

  const jaName = speciesData.names.find((n: any) => n.language.name === 'ja')?.name || data.name;
  const jaGenus = speciesData.genera.find((g: any) => g.language.name === 'ja')?.genus || '';
  const jaFlavorText = speciesData.flavor_text_entries
    .find((f: any) => f.language.name === 'ja' || f.language.name === 'ja-Hrkt')?.flavor_text || '';
  
  const jaTypes = data.types.map((t: any) => TYPE_NAME_MAP[t.type.name] || t.type.name);
  
  const isShiny = forceShiny || Math.random() < SHINY_RATE;
  
  return {
    id,
    name: jaName,
    image: data.sprites.other['official-artwork'].front_default,
    shinyImage: data.sprites.other['official-artwork'].front_shiny,
    isShiny,
    cry: data.cries?.latest || data.cries?.legacy,
    flavorText: jaFlavorText.replace(/\f/g, '').replace(/\n/g, ' '),
    types: jaTypes,
    genus: jaGenus
  };
};

const fetchQuizData = async (gen: string = 'all', type: string = 'all') => {
  let min = 1, max = MAX_POKEMON_ID;
  if (gen !== 'all') {
    [min, max] = GEN_RANGES[gen] || GEN_RANGES['all'];
  }

  let possibleIds: number[] = [];
  
  if (type !== 'all') {
    // Fetch IDs for the specific type
    const res = await fetch(`https://pokeapi.co/api/v2/type/${type}`);
    const data = await res.json();
    possibleIds = data.pokemon
      .map((p: any) => {
        const urlParts = p.pokemon.url.split('/');
        return parseInt(urlParts[urlParts.length - 2]);
      })
      .filter((id: number) => id >= min && id <= max);
  }

  const getRandomTargetId = () => {
    if (possibleIds.length > 0) {
      return possibleIds[Math.floor(Math.random() * possibleIds.length)];
    }
    return getRandomId(min, max);
  };

  const correctPokemon = await fetchPokemonData(getRandomTargetId());
  const wrongIds: number[] = [];
  while (wrongIds.length < 3) {
    const id = getRandomTargetId();
    if (id !== correctPokemon.id && !wrongIds.includes(id)) {
      wrongIds.push(id);
    }
  }
  
  const wrongNames = await Promise.all(
    wrongIds.map(async (id) => {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
      const data = await res.json();
      return data.names.find((n: any) => n.language.name === 'ja')?.name || 'Unknown';
    })
  );
  
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
  
  // Hint and Collection state
  const [hintLevel, setHintLevel] = useState(0); // 0: none, 1: types, 2: first char
  const [caughtPokemon, setCaughtPokemon] = useState<number[]>(() => 
    JSON.parse(localStorage.getItem('caughtPokemon') || '[]')
  );
  const [showCollection, setShowCollection] = useState(false);
  
  // Filters and Performance
  const [selectedGen, setSelectedGen] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [quizBuffer, setQuizBuffer] = useState<any>(null);

  // High score and streak
  const [bestScore, setBestScore] = useState(() => Number(localStorage.getItem('bestScore')) || 0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(() => Number(localStorage.getItem('maxStreak')) || 0);

  // Apply theme to body
  React.useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('appTheme', theme);
  }, [theme]);

  // Load initial preview and buffer
  React.useEffect(() => {
    const init = async () => {
      try {
        const preview = await fetchPokemonData(getRandomId());
        setPreviewPokemon(preview);
        const buffer = await fetchQuizData(selectedGen, selectedType);
        setQuizBuffer(buffer);
      } catch (error) {
        console.error('Failed to init', error);
      }
    };
    init();
  }, [selectedGen, selectedType]);

  const prefetchNextQuestion = useCallback(async () => {
    try {
      const data = await fetchQuizData(selectedGen, selectedType);
      setQuizBuffer(data);
    } catch (error) {
      console.error('Prefetch failed', error);
    }
  }, [selectedGen, selectedType]);

  const playCry = useCallback(() => {
    if (currentPokemon?.cry) {
      const audio = new Audio(currentPokemon.cry);
      audio.volume = 0.5;
      audio.play().catch(e => console.error('Audio play failed', e));
    }
  }, [currentPokemon]);

  const loadQuestion = useCallback(async () => {
    setIsCorrect(null);
    setShowResult(false);
    setInputValue('');
    setHintLevel(0);
    
    let nextPokemon, nextChoices;

    if (quizBuffer) {
      nextPokemon = quizBuffer.correctPokemon;
      nextChoices = quizBuffer.choices;
      setQuizBuffer(null);
      prefetchNextQuestion();
    } else {
      setIsLoading(true);
      try {
        const data = await fetchQuizData(selectedGen, selectedType);
        nextPokemon = data.correctPokemon;
        nextChoices = data.choices;
        prefetchNextQuestion();
      } catch (error) {
        console.error('Failed to load question', error);
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    }

    setCurrentPokemon(nextPokemon);
    setChoices(nextChoices);

    // Auto-play cry in cry mode
    if (displayMode === 'cry' && nextPokemon?.cry) {
      setTimeout(() => {
        const audio = new Audio(nextPokemon.cry);
        audio.volume = 0.5;
        audio.play().catch(e => console.error('Auto-play failed', e));
      }, 500);
    }
  }, [quizBuffer, selectedGen, selectedType, prefetchNextQuestion, displayMode]);

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
    
    // Play cry on reveal if silhouette mode
    if (displayMode === 'silhouette') {
      playCry();
    }

    if (correct) {
      // Add to collection
      setCaughtPokemon(prev => {
        if (!prev.includes(currentPokemon.id)) {
          const next = [...prev, currentPokemon.id];
          localStorage.setItem('caughtPokemon', JSON.stringify(next));
          return next;
        }
        return prev;
      });

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
  }, [currentPokemon, score, bestScore, currentStreak, maxStreak, totalQuestions, playCry, displayMode]);

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
  // Collection View
  if (showCollection) {
    return (
      <div className="app-container">
        <div className="glass-panel fade-in" style={{ padding: '2rem', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem' }}>📖 つかまえたポケモン ({caughtPokemon.length})</h2>
            <button onClick={() => setShowCollection(false)} style={{ background: 'var(--bg-gray)', color: 'var(--text-secondary)' }}>とじる</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '1rem' }}>
            {caughtPokemon.sort((a,b) => a-b).map(id => (
              <div key={id} style={{ textAlign: 'center', background: 'var(--bg-gray)', borderRadius: '8px', padding: '0.5rem' }}>
                <img 
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`} 
                  alt="caught" 
                  style={{ width: '60px', height: '60px', objectFit: 'contain' }} 
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>No.{id}</div>
              </div>
            ))}
          </div>
          {caughtPokemon.length === 0 && <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-secondary)' }}>まだ1ぴきもつかまえていないよ...</p>}
        </div>
      </div>
    );
  }

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
              🏆 さいこう: {bestScore}
            </div>
            <div className="score-badge">
              🔥 れんしょう: {maxStreak}
            </div>
            <button onClick={() => setShowCollection(true)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', background: 'var(--bg-gray)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 600 }}>
              📖 ずかん: {caughtPokemon.length}
            </button>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600 }}>いろをえらぶ</p>
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

          <button 
            onClick={() => setShowFilters(!showFilters)}
            style={{ 
              display: 'block', 
              margin: '0 auto 1.5rem', 
              fontSize: '0.875rem', 
              color: 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
          >
            {showFilters ? '▲ せっていを とじる' : '⚙️ くわしい せってい'}
          </button>

          {showFilters && (
            <div className="fade-in" style={{ marginBottom: '1.5rem', background: 'var(--bg-gray)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600 }}>どのちほうをだす？</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem', justifyContent: 'center' }}>
                  {['all', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map(gen => (
                    <button 
                      key={gen} 
                      onClick={() => setSelectedGen(gen)}
                      style={{ 
                        padding: '0.4rem 0.2rem', 
                        fontSize: '0.7rem', 
                        background: selectedGen === gen ? 'var(--primary-color)' : 'white',
                        color: selectedGen === gen ? 'white' : 'var(--text-primary)',
                        boxShadow: 'none',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      {REGION_NAME_MAP[gen]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600 }}>どのタイプをだす？</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.3rem', justifyContent: 'center' }}>
                  <button 
                    onClick={() => setSelectedType('all')}
                    style={{ 
                      gridColumn: 'span 2',
                      padding: '0.4rem 0.2rem', fontSize: '0.7rem', 
                      background: selectedType === 'all' ? 'var(--primary-color)' : 'white',
                      color: selectedType === 'all' ? 'white' : 'var(--text-primary)',
                      boxShadow: 'none', borderRadius: '6px', border: '1px solid var(--border-color)'
                    }}
                  >
                    すべて
                  </button>
                  {Object.entries(TYPE_NAME_MAP).map(([en, ja]) => (
                    <button 
                      key={en} 
                      onClick={() => setSelectedType(en)}
                      style={{ 
                        padding: '0.4rem 0.1rem', 
                        fontSize: '0.65rem', 
                        background: selectedType === en ? 'var(--primary-color)' : 'white',
                        color: selectedType === en ? 'white' : 'var(--text-primary)',
                        boxShadow: 'none',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden'
                      }}
                    >
                      {ja}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '2rem', display: 'flex', gap: '2rem', justifyContent: 'center' }}>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>もんだいの だしかた</p>
              <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', background: 'var(--bg-gray)', padding: '0.25rem', borderRadius: '8px' }}>
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
                  え
                </button>
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
                  かげ
                </button>
                <button 
                  onClick={() => setDisplayMode('cry')} 
                  style={{ 
                    padding: '0.5rem 1rem', 
                    fontSize: '0.875rem', 
                    background: displayMode === 'cry' ? 'var(--primary-color)' : 'transparent',
                    color: displayMode === 'cry' ? 'white' : 'var(--text-secondary)',
                    boxShadow: 'none',
                    borderRadius: '6px'
                  }}
                >
                  こえ
                </button>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', maxWidth: '320px', margin: '0 auto 1.5rem' }}>
            <button 
              className="bounce-in"
              onClick={() => startGame('choice')}
              style={{ padding: '1.25rem', fontSize: '1.25rem', background: 'linear-gradient(135deg, #6e8efb, #a777e3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', flex: 1 }}
            >
              <span>🎯</span> えらぶ
            </button>
            <button 
              className="bounce-in"
              onClick={() => startGame('input')}
              style={{ padding: '1.25rem', fontSize: '1.25rem', background: 'linear-gradient(135deg, #f093fb, #f5576c)', animationDelay: '0.1s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', flex: 1 }}
            >
              <span>⌨️</span> かく
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
          <p>よみこみちゅう...</p>
        </div>
      </div>
    );
  }

  // Quiz Screen
  if (!currentPokemon) return null;

  return (
    <div className="app-container">
      <div className="glass-panel bounce-in" style={{ padding: '2rem', width: '100%', maxWidth: '600px', position: 'relative' }}>
        <button onClick={resetGame} style={{ position: 'absolute', top: '1rem', left: '1rem', padding: '0.5rem 0.875rem', fontSize: '0.875rem', background: 'var(--bg-gray)', color: 'var(--text-secondary)' }}>
          ← もどる
        </button>
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', textAlign: 'right' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>てんすう: <strong style={{ color: 'var(--text-primary)' }}>{score}</strong></div>
          <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#f59e0b' }}>
            {currentStreak > 0 && '🔥'}
            れんしょう: {currentStreak}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', marginTop: '2rem' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {currentPokemon.isShiny && showResult && (
              <div className="shiny-sparkle" style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '2rem', animation: 'spin 2s linear infinite', zIndex: 5 }}>✨</div>
            )}
            
            {displayMode === 'cry' && !showResult ? (
              <div 
                onClick={playCry}
                className="bounce-in"
                style={{ 
                  width: '250px', 
                  height: '250px', 
                  borderRadius: '125px', 
                  background: 'var(--bg-gray)', 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: '4px dashed var(--border-color)',
                  gap: '0.5rem'
                }}
              >
                <div style={{ fontSize: '5rem' }}>🔈</div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>もういちど きく</div>
              </div>
            ) : (
              <img 
                src={currentPokemon.isShiny && showResult ? currentPokemon.shinyImage : currentPokemon.image} 
                alt="Pokemon" 
                className={`${displayMode === 'silhouette' && !showResult ? 'pokemon-silhouette' : 'pokemon-reveal'} ${currentPokemon.isShiny && showResult ? 'shiny-glow' : ''}`}
                style={{ width: '250px', height: '250px', objectFit: 'contain' }} 
              />
            )}

            {currentPokemon.cry && !showResult && displayMode !== 'cry' && (
              <button 
                onClick={playCry} 
                style={{ position: 'absolute', bottom: '0', right: '0', background: 'var(--bg-panel)', padding: '0.5rem', borderRadius: '50%', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                title="なきごえをきく"
              >
                🔊
              </button>
            )}
          </div>
          <h3 style={{ marginTop: '1rem', fontSize: '1.25rem', fontWeight: 600 }}>
            {displayMode === 'cry' && !showResult ? 'この なきごえは だーれだ？' : (displayMode === 'silhouette' ? 'ポケモン だーれだ？' : 'このポケモンの名前は？')}
          </h3>
          
          {hintLevel > 0 && (
            <div className="fade-in" style={{ marginTop: '0.5rem', fontSize: '0.875rem', padding: '0.5rem', background: 'var(--bg-gray)', borderRadius: '8px' }}>
              💡 <strong>ヒント:</strong> {hintLevel === 1 ? `タイプ: ${currentPokemon.types?.join(' / ')}` : `さいしょのもじ: ${currentPokemon.name[0]}`}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'center' }}>
          {!showResult && hintLevel < 2 && (
            <button 
              onClick={() => setHintLevel(prev => prev + 1)} 
              style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', background: 'var(--bg-gray)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
            >
              💡 ヒントをみる
            </button>
          )}
        </div>

        {gameMode === 'choice' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', marginTop: '1rem' }}>
            {choices.map((choice, index) => (
              <button 
                key={`${choice}-${index}`} 
                onClick={() => checkAnswer(choice)} 
                disabled={showResult} 
                className="fade-in"
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                  padding: '1rem', 
                  fontSize: '1rem', 
                  background: 'var(--bg-gray)', 
                  color: 'var(--text-primary)', 
                  border: '1px solid var(--border-color)', 
                  cursor: showResult ? 'not-allowed' : 'pointer',
                  boxShadow: 'none'
                }}
              >
                {choice}
              </button>
            ))}
          </div>
        )}

        {gameMode === 'input' && (
          <form onSubmit={handleInputSubmit} style={{ width: '100%', marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={showResult} placeholder="なまえをかいてね..." autoFocus />
            <button type="submit" disabled={showResult || !inputValue.trim()} style={{ background: 'var(--primary-color)', color: 'white', minWidth: '80px' }}>
              こたえる
            </button>
          </form>
        )}

        {showResult && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.1)', borderRadius: '16px', zIndex: 10 }}>
            <div className="glass-panel bounce-in" style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-panel)', border: isCorrect ? '2px solid var(--success)' : '2px solid var(--error)', width: '90%', maxWidth: '450px', maxHeight: '90%', overflowY: 'auto' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                {isCorrect ? '🎉' : '😢'}
              </div>
              {currentPokemon.isShiny && isCorrect && (
                <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#fbbf24', fontWeight: 700, animation: 'pulse 1s infinite' }}>
                  ✨ いろちがい！ ✨
                </div>
              )}
              <h2 style={{ fontSize: '1.5rem', color: isCorrect ? 'var(--success)' : 'var(--error)', marginBottom: '0.25rem', fontWeight: 700 }}>
                {isCorrect ? 'せいかい！' : 'ざんねん...'}
              </h2>
              <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                {currentPokemon.genus}
              </p>
              <h1 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 800 }}>{currentPokemon.name}</h1>
              
              <div style={{ background: 'var(--bg-gray)', padding: '1rem', borderRadius: '12px', textAlign: 'left', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                  {currentPokemon.flavorText || 'せつめいがみつかりませんでした。'}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {currentPokemon.types?.map(type => (
                    <span key={type} style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: 'var(--bg-panel)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                      {type}
                    </span>
                  ))}
                  {currentPokemon.cry && (
                    <button onClick={playCry} style={{ background: 'transparent', padding: '0', boxShadow: 'none', fontSize: '1rem', marginLeft: 'auto' }}>🔊</button>
                  )}
                </div>
              </div>
              
              <button onClick={nextQuestion} style={{ background: 'var(--primary-color)', color: 'white', padding: '0.875rem 2.5rem', fontSize: '1.125rem', fontWeight: 600, width: '100%' }}>
                つぎへ →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
