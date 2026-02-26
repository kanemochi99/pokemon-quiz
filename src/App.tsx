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

// Attacking type -> List of defending types it is strong against (2x)
const TYPE_CHART: Record<string, string[]> = {
  fire: ['grass', 'ice', 'bug', 'steel'],
  water: ['fire', 'ground', 'rock'],
  grass: ['water', 'ground', 'rock'],
  electric: ['water', 'flying'],
  ice: ['grass', 'ground', 'flying', 'dragon'],
  fighting: ['normal', 'ice', 'rock', 'dark', 'steel'],
  poison: ['grass', 'fairy'],
  ground: ['fire', 'electric', 'poison', 'rock', 'steel'],
  flying: ['grass', 'fighting', 'bug'],
  psychic: ['fighting', 'poison'],
  bug: ['grass', 'psychic', 'dark'],
  rock: ['fire', 'ice', 'flying', 'bug'],
  ghost: ['psychic', 'ghost'],
  dragon: ['dragon'],
  steel: ['ice', 'rock', 'fairy'],
  dark: ['psychic', 'ghost'],
  fairy: ['fighting', 'dragon', 'dark'],
  normal: []
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
  const resSpecies = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
  const speciesData = await resSpecies.json();

  let pokemonUrl = `https://pokeapi.co/api/v2/pokemon/${id}`;
  
  // 15% chance to pick a special variety (Mega, Gmax, Regional) if available
  if (speciesData.varieties && speciesData.varieties.length > 1 && Math.random() < 0.15) {
    const specialVarieties = speciesData.varieties.filter((v: any) => !v.is_default);
    if (specialVarieties.length > 0) {
      const variety = specialVarieties[Math.floor(Math.random() * specialVarieties.length)];
      pokemonUrl = variety.pokemon.url;
    }
  }

  const resPokemon = await fetch(pokemonUrl);
  const data = await resPokemon.json();

  const jaName = speciesData.names.find((n: any) => n.language.name === 'ja')?.name || data.name;
  const jaGenus = speciesData.genera.find((g: any) => g.language.name === 'ja')?.genus || '';
  const jaFlavorTextEntry = speciesData.flavor_text_entries.find((f: any) => f.language.name === 'ja-Hrkt') || 
                           speciesData.flavor_text_entries.find((f: any) => f.language.name === 'ja');
  
  const jaFlavorText = jaFlavorTextEntry ? jaFlavorTextEntry.flavor_text : 
                        (speciesData.flavor_text_entries.find((f: any) => f.language.name === 'en')?.flavor_text || '');
  
  const jaTypes = data.types.map((t: any) => TYPE_NAME_MAP[t.type.name] || t.type.name);
  
  const isShiny = forceShiny || Math.random() < SHINY_RATE;
  
  const imageUrl = data.sprites.other['official-artwork'].front_default;
  const shinyImageUrl = data.sprites.other['official-artwork'].front_shiny;
  
  // Preload images for faster display
  if (imageUrl) {
    const img = new Image();
    img.src = imageUrl;
  }
  if (shinyImageUrl) {
    const img = new Image();
    img.src = shinyImageUrl;
  }
  
  return {
    id,
    name: jaName,
    image: imageUrl,
    shinyImage: shinyImageUrl,
    isShiny,
    cry: data.cries?.latest || data.cries?.legacy,
    flavorText: jaFlavorText.replace(/\f/g, '').replace(/\n/g, ' '),
    types: jaTypes,
    genus: jaGenus
  };
};

const fetchQuizData = async (gen: string = 'all', type: string = 'all', category: 'name' | 'type' = 'name') => {
  let min = 1, max = MAX_POKEMON_ID;
  if (gen !== 'all') {
    [min, max] = GEN_RANGES[gen] || GEN_RANGES['all'];
  }

  let possibleIds: number[] = [];
  
  if (type !== 'all') {
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

  if (category === 'type') {
    // Determine weaknesses
    const weaknesses: string[] = [];
    Object.entries(TYPE_CHART).forEach(([attacker, strongAgainst]) => {
      // Check if this attacker is strong against any of the pokemon's types
      const isStrong = correctPokemon.types?.some(typeJa => {
        const defTypeEn = Object.entries(TYPE_NAME_MAP).find(([_, ja]) => ja === typeJa)?.[0];
        return defTypeEn && strongAgainst.includes(defTypeEn);
      });
      if (isStrong) weaknesses.push(TYPE_NAME_MAP[attacker]);
    });

    if (weaknesses.length === 0) {
      // Fallback if no weaknesses found (rare, eg Eelektross but we don't have abilities yet)
      weaknesses.push('なし');
    }

    const correctAnswer = weaknesses[Math.floor(Math.random() * weaknesses.length)];
    
    const allTypesJa = Object.values(TYPE_NAME_MAP);
    const wrongChoices: string[] = [];
    while (wrongChoices.length < 3) {
      const randomType = allTypesJa[Math.floor(Math.random() * allTypesJa.length)];
      if (!weaknesses.includes(randomType) && !wrongChoices.includes(randomType)) {
        wrongChoices.push(randomType);
      }
    }

    const choices = [correctAnswer, ...wrongChoices].sort(() => Math.random() - 0.5);
    return { correctPokemon, choices, correctAnswer };
  }

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
  return { correctPokemon, choices, correctAnswer: correctPokemon.name };
};

function App() {
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('silhouette');
  const [theme, setTheme] = useState<ThemeType>(() => (localStorage.getItem('appTheme') as ThemeType) || 'light');
  const [currentPokemon, setCurrentPokemon] = useState<Pokemon | null>(null);
  const [previewPokemon, setPreviewPokemon] = useState<Pokemon | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<string>('');
  const [score, setScore] = useState(0);
  const [quizCategory, setQuizCategory] = useState<'name' | 'type'>('name');
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Hint and Collection state
  const [hintLevel, setHintLevel] = useState(0); // 0: none, 1: types, 2: first char
  const [caughtPokemon, setCaughtPokemon] = useState<number[]>(() => 
    JSON.parse(localStorage.getItem('caughtPokemon') || '[]')
  );
  
  // Filters and Performance
  const [selectedGen, setSelectedGen] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [quizBuffer, setQuizBuffer] = useState<any>(null);

  // High score and streak
  const [bestScore, setBestScore] = useState(() => Number(localStorage.getItem('bestScore')) || 0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(() => Number(localStorage.getItem('maxStreak')) || 0);
  const [totalCorrectCount, setTotalCorrectCount] = useState(() => Number(localStorage.getItem('totalCorrectCount')) || 0);

  // Time Attack states
  const [timeLimit, setTimeLimit] = useState<number>(60);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [timeAttackBestScores, setTimeAttackBestScores] = useState<Record<number, number>>(() => 
    JSON.parse(localStorage.getItem('timeAttackBestScores') || '{"30": 0, "60": 0, "120": 0}')
  );

  const [showToast, setShowToast] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'speed' | 'book' | 'settings'>('home');

  // Shiritori states
  const [isShiritori, setIsShiritori] = useState(false);
  const [shiritoriHistory, setShiritoriHistory] = useState<{ sender: 'player' | 'ai', name: string, image?: string }[]>([]);
  const [usedPokemonNames, setUsedPokemonNames] = useState<Set<string>>(new Set());
  const [allPokemonDatabase, setAllPokemonDatabase] = useState<{ name: string, id: number }[]>([]);
  const [shiritoriInput, setShiritoriInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [shiritoriWinner, setShiritoriWinner] = useState<'player' | 'ai' | null>(null);
  const [shiritoriLoading, setShiritoriLoading] = useState(false);
  const [shiritoriError, setShiritoriError] = useState('');

  const startShiritori = async () => {
    setIsShiritori(true);
    setShiritoriHistory([]);
    setUsedPokemonNames(new Set());
    setShiritoriWinner(null);
    setShiritoriError('');
    setIsAiThinking(true);
    
    // Ensure database is loaded
    if (allPokemonDatabase.length === 0) {
      await fetchAllPokemonNames();
    }
    
    // AI's first move
    setTimeout(() => {
      // Find a pool of common/cool pokemon for the start (optional, but good)
      const candidates = allPokemonDatabase.filter(p => !p.name.endsWith('ン'));
      const aiChoice = candidates[Math.floor(Math.random() * candidates.length)];
      
      if (aiChoice) {
        setUsedPokemonNames(new Set([aiChoice.name]));
        setShiritoriHistory([{ 
          sender: 'ai', 
          name: aiChoice.name, 
          image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${aiChoice.id}.png` 
        }]);
      }
      setIsAiThinking(false);
    }, 1000);
  };

  const handleShiritoriSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = shiritoriInput.trim();
    if (!rawInput || isAiThinking || shiritoriWinner) return;
    const input = toKatakana(rawInput);

    // Validate if it's a real pokemon
    const pokemon = allPokemonDatabase.find(p => p.name === input);
    if (!pokemon) {
      setShiritoriError('それは ポケモンの なまえじゃ ないみたい...');
      return;
    }

    // Check if used
    if (usedPokemonNames.has(input)) {
      setShiritoriError('その なまえは もう でたよ！');
      return;
    }

    // Check link
    if (shiritoriHistory.length > 0) {
      const lastAiWord = shiritoriHistory[shiritoriHistory.length - 1].name;
      const targetChar = normalizeLastChar(lastAiWord);
      if (input[0] !== targetChar) {
        setShiritoriError(`「${targetChar}」から はじまる なまえに してね！`);
        return;
      }
    }

    // Add to history
    setShiritoriError('');
    const newUsed = new Set(usedPokemonNames).add(input);
    setUsedPokemonNames(newUsed);
    setShiritoriHistory(prev => [...prev, { 
      sender: 'player', 
      name: input, 
      image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png` 
    }]);
    setShiritoriInput('');

    if (input.endsWith('ン')) {
      setShiritoriWinner('ai');
      return;
    }

    // AI Turn
    setIsAiThinking(true);
    setTimeout(() => {
      const targetChar = normalizeLastChar(input);
      const candidates = allPokemonDatabase.filter(p => 
        p.name.startsWith(targetChar) && !newUsed.has(p.name)
      );

      if (candidates.length === 0) {
        setShiritoriWinner('player');
        setIsAiThinking(false);
        return;
      }

      // Pro AI: Avoid names ending in 'ン' if possible
      let aiChoice = candidates.find(p => !p.name.endsWith('ン'));
      if (!aiChoice) aiChoice = candidates[Math.floor(Math.random() * candidates.length)];

      setUsedPokemonNames(prev => new Set(prev).add(aiChoice!.name));
      setShiritoriHistory(prev => [...prev, { 
        sender: 'ai', 
        name: aiChoice!.name, 
        image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${aiChoice!.id}.png` 
      }]);
      
      if (aiChoice!.name.endsWith('ン')) {
        setShiritoriWinner('player');
      }
      setIsAiThinking(false);
    }, 1500);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'ポケモンクイズ',
      text: 'さいきょうの ポケモンマスターを めざせ！この ポケモンクイズ、めちゃくちゃ たのしいよ！',
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      } catch (err) {
        console.error('Clipboard failed', err);
      }
    }
  };

  const getLevelInfo = (count: number) => {
    const level = Math.min(100, Math.floor(count / 5) + 1);
    const progress = count % 5;
    const progressPercent = (progress / 5) * 100;
    return { level, progress, progressPercent };
  };

  const getTrainerTitle = (level: number) => {
    if (level >= 100) return '✨ ポケモンマスター ✨';
    if (level >= 80) return '👑 マスター';
    if (level >= 60) return '🔥 伝説のトレーナー';
    if (level >= 50) return '🏆 チャンピオン';
    if (level >= 40) return '⚔️ 四天王';
    if (level >= 30) return '🎖️ ジムリーダー';
    if (level >= 20) return '🌟 かんろくトレーナー';
    if (level >= 10) return '🔰 ホープトレーナー';
    return '🥚 ビギナー';
  };

  const renderHeader = (title: string, subtitle?: string) => (
    <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{title}</h1>
        <button 
          onClick={() => setShowAbout(true)} 
          style={{ background: 'var(--bg-gray)', color: 'var(--text-secondary)', padding: 0, fontSize: '0.75rem', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none' }}
          title="あそびかた"
        >
          ❓
        </button>
      </div>
      {subtitle && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{subtitle}</p>}
    </div>
  );

  /* Refactored Home Tab */
  const renderHomeTab = () => (
    <div className="fade-in">
      {previewPokemon && (
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <img src={previewPokemon.image} alt="" style={{ width: '120px', height: '120px', objectFit: 'contain', opacity: 0.8, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }} />
        </div>
      )}
      {renderHeader('🎮 ポケモンクイズ')}
      
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: 'white', padding: '0.5rem', borderRadius: '12px', minWidth: '60px', textAlign: 'center', fontWeight: 800, textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.6rem', opacity: 0.9 }}>Lv.</div>
          <div style={{ fontSize: '1.25rem', lineHeight: 1 }}>{getLevelInfo(totalCorrectCount).level}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.25rem' }}>{getTrainerTitle(getLevelInfo(totalCorrectCount).level)}</div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${getLevelInfo(totalCorrectCount).progressPercent}%`, height: '100%', background: 'var(--primary-color)', transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', textAlign: 'center' }}>もんだいの だしかた</p>
        <div className="glass-panel" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', padding: '0.4rem', borderRadius: '16px' }}>
           {['illustration', 'silhouette', 'cry'].map(mode => (
             <button 
               key={mode}
               onClick={() => setDisplayMode(mode as any)}
               className={displayMode === mode ? 'btn-primary' : ''}
               style={{ 
                 flex: 1, padding: '0.6rem', borderRadius: '12px', fontSize: '0.875rem',
                 background: displayMode === mode ? undefined : 'transparent',
                 color: displayMode === mode ? 'white' : 'var(--text-secondary)',
                 boxShadow: 'none'
               }}
             >
               {mode === 'illustration' ? '📸 え' : mode === 'silhouette' ? '👤 かげ' : '🔊 こえ'}
             </button>
           ))}
        </div>
      </div>

      <div className="glass-panel" style={{ background: 'linear-gradient(135deg, #6e8efb, #a777e3)', border: 'none', color: 'white', marginBottom: '1rem', padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'white' }}>🎯 クイズに ちょうせん</h3>
        <p style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '1rem' }}>せいかいして ポケモンを つかまえよう！</p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => startGame('choice')} style={{ flex: 1, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }}>
            えらぶ
          </button>
          <button onClick={() => startGame('input')} style={{ flex: 1, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }}>
            かく
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)', border: 'none', color: 'white', padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'white' }}>🔄 しりとりバトル</h3>
        <p style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '1rem' }}>AIと しりとりで たたかおう！</p>
        <button onClick={startShiritori} style={{ width: '100%', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }}>
          バトルを はじめる
        </button>
      </div>
    </div>
  );

  /* Refactored Speed Tab */
  const renderSpeedTab = () => (
    <div className="fade-in">
      {renderHeader('⚡ タイムアタック', '制限時間内に 何問 せいかいできるかな？')}
      
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 800, marginBottom: '0.75rem', textAlign: 'center' }}>じかんを えらぶ</p>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.03)', padding: '0.3rem', borderRadius: '12px' }}>
          {[30, 60, 120].map(time => (
            <button 
              key={time}
              onClick={() => setTimeLimit(time)}
              className={timeLimit === time ? 'btn-primary' : ''}
              style={{ 
                flex: 1, padding: '0.6rem', borderRadius: '10px', fontSize: '0.875rem',
                background: timeLimit === time ? undefined : 'transparent',
                color: timeLimit === time ? 'white' : 'var(--text-secondary)',
                boxShadow: 'none'
              }}
            >
              {time}秒
            </button>
          ))}
        </div>
        <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '1.125rem', fontWeight: 800, color: 'var(--primary-color)' }}>
          🏆 さいこう: {timeAttackBestScores[timeLimit] || 0}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
        <button 
          onClick={() => startGame('choice', 'name', true)}
          style={{ padding: '1.25rem', fontSize: '1.25rem', background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: 'white', borderRadius: '24px', boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)' }}
        >
          ⚡ えらんで チャレンジ
        </button>
        <button 
          onClick={() => startGame('input', 'name', true)}
          style={{ padding: '1.25rem', fontSize: '1.25rem', background: 'linear-gradient(135deg, #FF8C00, #FF4500)', color: 'white', borderRadius: '24px', boxShadow: '0 4px 15px rgba(255, 69, 0, 0.3)' }}
        >
          🔥 かいて チャレンジ
        </button>
      </div>
    </div>
  );

  /* Refactored Book Tab with Scroll Area */
  const renderBookTab = () => (
    <div className="fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {renderHeader('📖 ポケモンずかん', `${caughtPokemon.length} ぴき つかまえたよ！`)}
      
      <div className="glass-panel scroll-area" style={{ padding: '0.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))', gap: '0.5rem', paddingBottom: '2rem' }}>
          {caughtPokemon.sort((a,b) => a-b).map(id => (
            <div key={id} style={{ background: 'rgba(255,255,255,0.5)', borderRadius: '12px', padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
              <img 
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`} 
                alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'contain' }} 
              />
              <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '0.2rem', fontWeight: 800 }}>#{String(id).padStart(3, '0')}</div>
            </div>
          ))}
          {caughtPokemon.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
              まだ 1ぴきも つかまえていないよ。<br />クイズで つかまえよう！
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="fade-in">
      {renderHeader('⚙️ せってい')}
      
      <div className="glass-panel" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 800, marginBottom: '0.75rem' }}>テーマ（いろ）</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`theme-circle ${theme === t.id ? 'active' : ''}`}
              style={{ 
                backgroundColor: t.color, 
                width: '40px', height: '40px', 
                borderRadius: '50%',
                border: theme === t.id ? '3px solid var(--text-primary)' : (t.id === 'light' ? '1px solid #ddd' : 'none'),
                boxShadow: theme === t.id ? '0 0 0 2px var(--bg-panel), 0 4px 8px rgba(0,0,0,0.2)' : 'none',
                transition: 'transform 0.2s',
                transform: theme === t.id ? 'scale(1.1)' : 'scale(1)'
              }}
              onClick={() => setTheme(t.id)}
              aria-label={t.label}
            />
          ))}
        </div>
      </div>

      <div className="glass-panel" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
           <p style={{ fontSize: '0.875rem', fontWeight: 800 }}>もんだいの フィルター</p>
           <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
             {showFilters ? 'とじる' : 'ひらく'}
           </button>
        </div>
        
        {showFilters && (
          <div className="fade-in">
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', marginTop: '0.5rem' }}>ちほう</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem', marginBottom: '1rem' }}>
              {['all', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map(gen => (
                <button 
                  key={gen} 
                  onClick={() => setSelectedGen(gen)} 
                  className={selectedGen === gen ? 'btn-primary' : ''}
                  style={{ 
                    padding: '0.4rem 0', fontSize: '0.7rem', 
                    borderRadius: '8px',
                    background: selectedGen === gen ? undefined : 'rgba(0,0,0,0.03)', 
                    color: selectedGen === gen ? 'white' : 'var(--text-primary)', 
                    border: selectedGen === gen ? 'none' : '1px solid var(--border-color)', 
                    boxShadow: 'none' 
                  }}
                >
                  {REGION_NAME_MAP[gen]}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>タイプ</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
              <button 
                onClick={() => setSelectedType('all')} 
                className={selectedType === 'all' ? 'btn-primary' : ''}
                style={{ 
                  gridColumn: 'span 4', padding: '0.5rem 0', fontSize: '0.75rem', 
                  borderRadius: '8px',
                   background: selectedType === 'all' ? undefined : 'rgba(0,0,0,0.03)',
                  color: selectedType === 'all' ? 'white' : 'var(--text-primary)', 
                  border: selectedType === 'all' ? 'none' : '1px solid var(--border-color)', 
                  marginBottom: '0.25rem'
                }}
              >
                すべて
              </button>
              {Object.entries(TYPE_NAME_MAP).map(([en, ja]) => (
                <button 
                  key={en} 
                  onClick={() => setSelectedType(en)} 
                  className={selectedType === en ? 'btn-primary' : ''}
                  style={{ 
                    padding: '0.4rem 0', fontSize: '0.65rem', 
                    borderRadius: '8px',
                    background: selectedType === en ? undefined : 'rgba(0,0,0,0.03)', 
                    color: selectedType === en ? 'white' : 'var(--text-primary)', 
                    border: selectedType === en ? 'none' : '1px solid var(--border-color)', 
                    whiteSpace: 'nowrap', overflow: 'hidden' 
                  }}
                >
                  {ja}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button 
        onClick={handleShare}
        className="btn-secondary"
        style={{ width: '100%', padding: '1rem', borderRadius: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
      >
        <span>🎁</span> ともだちに おしえる
      </button>
    </div>
  );

  // Timer Effect
  React.useEffect(() => {
    let timer: any;
    if (timeLeft !== null && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimeUp(true);
      setTimeLeft(null);
      // Play time up sound or effect if needed
    }
    return () => clearInterval(timer);
  }, [timeLeft]);

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
      const data = await fetchQuizData(selectedGen, selectedType, quizCategory);
      setQuizBuffer(data);
    } catch (error) {
      console.error('Prefetch failed', error);
    }
  }, [selectedGen, selectedType, quizCategory]);

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
    setImageLoaded(false);
    
    let nextPokemon, nextChoices, nextCorrectAnswer;

    if (quizBuffer) {
      nextPokemon = quizBuffer.correctPokemon;
      nextChoices = quizBuffer.choices;
      nextCorrectAnswer = quizBuffer.correctAnswer;
      setQuizBuffer(null);
      prefetchNextQuestion();
    } else {
      setIsLoading(true);
      try {
        const data = await fetchQuizData(selectedGen, selectedType, quizCategory);
        nextPokemon = data.correctPokemon;
        nextChoices = data.choices;
        nextCorrectAnswer = data.correctAnswer;
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
    setCorrectAnswer(nextCorrectAnswer);

    // Auto-play cry for all modes
    if (nextPokemon?.cry) {
      setTimeout(() => {
        const audio = new Audio(nextPokemon.cry);
        audio.volume = 0.5;
        audio.play().catch(e => console.error('Auto-play failed', e));
      }, 500);
    }
  }, [quizBuffer, selectedGen, selectedType, prefetchNextQuestion]);

  const startGame = useCallback((mode: GameMode, category: 'name' | 'type' = 'name', isTimeAttack: boolean = false) => {
    setGameMode(mode);
    setQuizCategory(category);
    setScore(0);
    setTotalQuestions(0);
    setCurrentStreak(0);
    setIsTimeUp(false);
    if (isTimeAttack) {
      setTimeLeft(timeLimit);
    } else {
      setTimeLeft(null);
    }
    setTimeout(() => loadQuestion(), 0);
  }, [loadQuestion, timeLimit]);

  const checkAnswer = useCallback((answer: string) => {
    if (!currentPokemon || isTimeUp) return;
    const correct = (correctAnswer || currentPokemon.name) === answer;
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
      
      const newTotal = totalCorrectCount + 1;
      setTotalCorrectCount(newTotal);
      localStorage.setItem('totalCorrectCount', String(newTotal));

      // Level up celebration!
      const oldLevel = getLevelInfo(totalCorrectCount).level;
      const newLevel = getLevelInfo(newTotal).level;
      if (newLevel > oldLevel) {
        setTimeout(() => {
          confetti({
            particleCount: 200,
            spread: 120,
            origin: { y: 0.3 },
            colors: ['#3b82f6', '#10b981', '#fbbf24']
          });
        }, 500);
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

  const toKatakana = (str: string) => {
    return str.replace(/[ぁ-ん]/g, (s) => String.fromCharCode(s.charCodeAt(0) + 0x60));
  };

  const normalizeLastChar = (name: string) => {
    const smallToLarge: Record<string, string> = {
      'ァ': 'ア', 'ィ': 'イ', 'ゥ': 'ウ', 'ェ': 'エ', 'ォ': 'オ',
      'ッ': 'ツ', 'ャ': 'ヤ', 'ュ': 'ユ', 'ョ': 'ヨ', 'ヮ': 'ワ',
    };
    let last = name.slice(-1);
    if (last === 'ー' && name.length > 1) {
      last = name.slice(-2, -1);
    }
    return smallToLarge[last] || last;
  };

  const fetchAllPokemonNames = async () => {
    if (shiritoriLoading || allPokemonDatabase.length > 0) return;
    setShiritoriLoading(true);
    try {
      const database: { name: string, id: number }[] = [];
      const batchSize = 100;
      const total = 1025;
      
      for (let i = 1; i <= total; i += batchSize) {
        const promises = [];
        for (let j = i; j < i + batchSize && j <= total; j++) {
          promises.push(
            fetch(`https://pokeapi.co/api/v2/pokemon-species/${j}`)
              .then(res => res.json())
              .then(data => {
                const jaName = data.names.find((n: any) => n.language.name === 'ja-Hrkt')?.name || 
                               data.names.find((n: any) => n.language.name === 'ja')?.name;
                if (jaName) database.push({ name: jaName, id: j });
              })
              .catch(e => console.error(`Failed to fetch species ${j}`, e))
          );
        }
        await Promise.all(promises);
      }
      setAllPokemonDatabase(database);
    } finally {
      setShiritoriLoading(false);
    }
  };

  const nextQuestion = useCallback(() => {
    loadQuestion();
  }, [loadQuestion]);

  const resetGame = useCallback(() => {
    setGameMode(null);
    setIsTimeUp(false);
    setTimeLeft(null);
  }, []);

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      checkAnswer(inputValue.trim());
    }
  };

  /* Refactored Menu Render */
  if (!gameMode && !isShiritori) {
    return (
      <div className="app-container">
        <div className="main-content">
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingBottom: '1rem' }}>
            {activeTab === 'home' && renderHomeTab()}
            {activeTab === 'speed' && renderSpeedTab()}
            {activeTab === 'book' && renderBookTab()}
            {activeTab === 'settings' && renderSettingsTab()}
          </div>
        </div>

        <div className="tab-bar">
          <button className={`tab-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
            <span className="tab-icon">🏠</span>
            <span>ホーム</span>
          </button>
          <button className={`tab-item ${activeTab === 'speed' ? 'active' : ''}`} onClick={() => setActiveTab('speed')}>
            <span className="tab-icon">⚡</span>
            <span>タイム</span>
          </button>
          <button className={`tab-item ${activeTab === 'book' ? 'active' : ''}`} onClick={() => setActiveTab('book')}>
            <span className="tab-icon">📖</span>
            <span>ずかん</span>
          </button>
          <button className={`tab-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <span className="tab-icon">⚙️</span>
            <span>せってい</span>
          </button>
        </div>

        {showToast && (
          <div className="fade-in" style={{ position: 'fixed', bottom: 'calc(var(--tab-bar-height) + 1rem)', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '30px', fontSize: '0.875rem', fontWeight: 600, zIndex: 200, pointerEvents: 'none' }}>
            ✅ URLを コピーしたよ！
          </div>
        )}
      </div>
    );
  }

  // Shiritori Screen
  /* Refactored Shiritori Screen */
  if (isShiritori) {
    const lastWord = shiritoriHistory.length > 0 ? shiritoriHistory[shiritoriHistory.length - 1].name : '';
    const nextChar = lastWord ? normalizeLastChar(lastWord) : '';

    return (
      <div className="app-container">
        <div className="main-content">
          <div className="glass-panel" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexShrink: 0 }}>
              <button onClick={() => setIsShiritori(false)} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                ← もどる
              </button>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>🔄 しりとりバトル</h2>
              <div style={{ width: '60px' }}></div>
            </div>

            {shiritoriLoading ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                <div className="pulse" style={{ fontSize: '3rem' }}>🔍</div>
                <p style={{ fontWeight: 700, textAlign: 'center' }}>ポケモンの なまえを<br />おぼえています...</p>
                <div style={{ width: '200px', height: '8px', background: 'var(--bg-gray)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary-color), #DA70D6)', width: `${Math.min(100, (allPokemonDatabase.length / 1025) * 100)}%`, transition: 'width 0.3s' }}></div>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{allPokemonDatabase.length} / 1025</p>
              </div>
            ) : (
              <>
                {/* Chat History Area (Scrollable) */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem', marginBottom: '1rem', scrollBehavior: 'smooth' }}>
                  {shiritoriHistory.length === 0 && (
                    <div style={{ textAlign: 'center', marginTop: 'auto', marginBottom: 'auto', color: 'var(--text-secondary)' }}>
                      <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🗣️</div>
                      <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>しりとりを はじめよう！</p>
                      <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>しっている ポケモンの なまえを<br />したの はこに いれてね。</p>
                    </div>
                  )}
                  {shiritoriHistory.map((chat, i) => (
                    <div key={i} className="fade-in" style={{ display: 'flex', justifyContent: chat.sender === 'player' ? 'flex-end' : 'flex-start', alignItems: 'center', gap: '0.5rem' }}>
                      {chat.sender === 'ai' && (
                        <div style={{ width: '36px', height: '36px', background: 'white', borderRadius: '50%', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <img src={chat.image} alt="" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                        </div>
                      )}
                      <div style={{ 
                        maxWidth: '75%', 
                        padding: '0.75rem 1rem', 
                        borderRadius: '18px', 
                        borderTopLeftRadius: chat.sender === 'ai' ? '4px' : '18px',
                        borderTopRightRadius: chat.sender === 'player' ? '4px' : '18px',
                        background: chat.sender === 'player' ? 'var(--primary-color)' : 'white',
                        color: chat.sender === 'player' ? 'white' : 'var(--text-primary)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        border: chat.sender === 'ai' ? '1px solid var(--border-color)' : 'none',
                        fontWeight: 700,
                        fontSize: '1rem'
                      }}>
                        {chat.name}
                      </div>
                      {chat.sender === 'player' && (
                        <div style={{ width: '36px', height: '36px', background: 'white', borderRadius: '50%', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <img src={chat.image} alt="" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                        </div>
                      )}
                    </div>
                  ))}
                  {isAiThinking && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '0.5rem' }}>
                      <div className="glass-panel pulse" style={{ padding: '0.6rem 1.25rem', borderRadius: '18px', fontSize: '0.875rem', background: 'white', border: '1px solid var(--border-color)', fontWeight: 600 }}>
                        カンガエチュウ...
                      </div>
                    </div>
                  )}
                  <div id="shiritori-bottom" style={{ height: '1px' }}></div>
                </div>

                {/* Input Area (Fixed at bottom of flex container) */}
                <div style={{ flexShrink: 0 }}>
                  {shiritoriWinner ? (
                    <div className="fade-in" style={{ background: 'rgba(0,0,0,0.05)', padding: '1rem', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{shiritoriWinner === 'player' ? '🏆' : '💦'}</div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                        {shiritoriWinner === 'player' ? 'きみの かち！' : 'AIの かち！'}
                      </h2>
                      <button onClick={startShiritori} className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                        もういっかい！
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {!isAiThinking && nextChar && (
                        <div className="fade-in" style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-color)', textAlign: 'center' }}>
                          つぎは <span style={{ fontSize: '1rem', background: 'var(--primary-color)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '6px' }}>{nextChar}</span> から はじまる なまえ！
                        </div>
                      )}
                      <form onSubmit={handleShiritoriSubmit} style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
                        {shiritoriError && (
                          <div className="bounce-in" style={{ position: 'absolute', top: '-3rem', left: 0, right: 0, background: '#fee2e2', color: '#dc2626', padding: '0.5rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800, textAlign: 'center', border: '2px solid #fecaca', zIndex: 50 }}>
                            ⚠️ {shiritoriError}
                          </div>
                        )}
                        <input 
                          type="text" 
                          value={shiritoriInput}
                          onChange={(e) => setShiritoriInput(e.target.value)}
                          placeholder={nextChar ? `「${nextChar}」からはじまるなまえ` : "なまえを いれてね"}
                          style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: '2px solid var(--border-color)', fontSize: '1rem', outline: 'none', background: 'white' }}
                        />
                        <button type="submit" className="btn-primary" disabled={!shiritoriInput.trim() || isAiThinking} style={{ padding: '0 1.2rem' }}>
                          OK
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </>
            )}
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

  /* Refactored Game Render */
  return (
    <div className="app-container">
      <div className="main-content">
        {/* Game Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '0.5rem' }}>
          <button onClick={resetGame} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            ← もどる
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
             <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-color)' }}>{score} <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>pts</span></div>
             {currentStreak > 0 && <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700 }}>🔥 {currentStreak}連勝</div>}
          </div>
        </div>

        {timeLeft !== null && (
          <div style={{ 
            position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)',
            background: timeLeft <= 10 ? 'var(--error)' : 'var(--bg-panel)',
            color: timeLeft <= 10 ? 'white' : 'var(--text-primary)',
            padding: '0.25rem 1rem', borderRadius: '20px', fontWeight: 800,
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            zIndex: 20
          }}>
            ⏱️ {timeLeft}
          </div>
        )}

        {/* Pokemon Display Area */}
        <div className="pokemon-display-area">
          <div style={{ position: 'relative' }}>
             {/* Shiny Effect */}
             {currentPokemon.isShiny && showResult && (
               <div className="shiny-sparkle" style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '3rem', animation: 'spin 3s linear infinite', zIndex: 5 }}>✨</div>
             )}

             {/* Image / Silhouette / Cry Button */}
             {displayMode === 'cry' && !showResult ? (
                 <button onClick={playCry} className="bounce-in btn-secondary" style={{ width: '200px', height: '200px', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: '4px dashed var(--border-color)' }}>
                    <span style={{ fontSize: '4rem' }}>🔈</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>タップして きく</span>
                 </button>
             ) : (
                 <>
                   {!imageLoaded && (
                     <div style={{ width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <div className="pulse" style={{ fontSize: '3rem' }}>⏳</div>
                     </div>
                   )}
                   <img 
                     src={currentPokemon.isShiny && showResult ? currentPokemon.shinyImage : currentPokemon.image} 
                     alt="Pokemon" 
                     className={`pokemon-image ${displayMode === 'silhouette' && !showResult ? 'pokemon-silhouette' : 'pokemon-reveal'} ${currentPokemon.isShiny && showResult ? 'shiny-glow' : ''}`}
                     onLoad={() => setImageLoaded(true)}
                     style={{ display: imageLoaded ? 'block' : 'none' }}
                   />
                 </>
             )}

             {/* Cry Button (Overlay) */}
             {currentPokemon.cry && !showResult && displayMode !== 'cry' && (
                <button onClick={playCry} className="btn-icon" style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--bg-panel)', border: '1px solid var(--border-color)' }}>
                  🔊
                </button>
             )}
          </div>
        </div>

        {/* Question Text */}
        <h3 style={{ textAlign: 'center', margin: '1rem 0', fontSize: '1.2rem', fontWeight: 700 }}>
             {quizCategory === 'type' ? 'このポケモンの「じゃくてん」は？' : 
              (displayMode === 'cry' && !showResult ? 'だれの なきごえ？' : 
               (displayMode === 'silhouette' ? 'ポケモン だーれだ？' : 'このポケモンの名前は？'))}
        </h3>

        {/* Hints */}
        {!showResult && hintLevel > 0 && (
           <div className="fade-in glass-panel" style={{ padding: '0.5rem 1rem', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
              💡 {hintLevel === 1 ? `タイプ: ${currentPokemon.types?.join(' / ')}` : `ヒント: ${currentPokemon.name[0]}...`}
           </div>
        )}
        {!showResult && hintLevel < 2 && (
            <div style={{ textAlign: 'center', marginBottom: '1rem', height: '30px' }}>
               <button onClick={() => setHintLevel(h => h + 1)} style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '20px' }}>
                 💡 ヒント
               </button>
            </div>
        )}

        {/* Options / Input Area */}
        {gameMode === 'choice' && (
           <div className="options-area">
              {choices.map((choice, i) => (
                 <button 
                   key={`${choice}-${i}`}
                   onClick={() => checkAnswer(choice)}
                   disabled={showResult}
                   className="option-btn fade-in"
                   style={{ animationDelay: `${i * 0.05}s` }}
                 >
                   {choice}
                 </button>
              ))}
           </div>
        )}

        {gameMode === 'input' && (
           <form onSubmit={handleInputSubmit} className="input-area">
              <input 
                 type="text" 
                 value={inputValue} 
                 onChange={(e) => setInputValue(e.target.value)} 
                 disabled={showResult} 
                 placeholder="なまえを いれてね" 
                 autoFocus 
              />
              <button type="submit" className="btn-primary" disabled={showResult || !inputValue.trim()} style={{ width: '100%', marginTop: '0.5rem' }}>
                 こたえる
              </button>
           </form>
        )}

        {/* Result Overlay */}
        {showResult && (
           <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="glass-panel bounce-in" style={{ width: '90%', maxWidth: '400px', padding: '2rem', textAlign: 'center', background: 'var(--bg-panel)', maxHeight: '90vh', overflowY: 'auto' }}>
                 <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>{isCorrect ? '🎉' : '😢'}</div>
                 <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: isCorrect ? 'var(--success)' : 'var(--error)', marginBottom: '0.5rem' }}>
                   {isCorrect ? 'せいかい！' : 'ざんねん...'}
                 </h2>
                 <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>
                   {currentPokemon.name}
                 </div>
                 
                 <img src={currentPokemon.isShiny ? currentPokemon.shinyImage : currentPokemon.image} style={{ height: '150px', objectFit: 'contain' }} />

                 <div style={{ margin: '1.5rem 0', textAlign: 'left', background: 'rgba(255,255,255,0.5)', padding: '1rem', borderRadius: '12px' }}>
                    {quizCategory === 'type' && !isCorrect && (
                       <div style={{ marginBottom: '0.5rem', color: 'var(--error)', fontWeight: 700 }}>
                          せいかい: {correctAnswer}
                       </div>
                    )}
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                       {currentPokemon.flavorText}
                    </div>
                 </div>

                 <button onClick={nextQuestion} className="btn-primary" style={{ width: '100%' }}>
                    つぎへ
                 </button>
              </div>
           </div>
        )}
        
        {/* Time Up Overlay */}
        {isTimeUp && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100 }}>
            <div className="glass-panel bounce-in" style={{ padding: '2rem', textAlign: 'center', width: '90%', maxWidth: '360px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '4rem', marginBottom: '0.5rem', animation: 'tada 1s' }}>⏰</div>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem', color: 'var(--text-primary)', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>タイムアップ！</h2>
              <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                しゅうりょう！ きみの スコアは...
              </p>
              
              <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-panel)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '4.5rem', fontWeight: 900, color: 'var(--primary-color)', lineHeight: '1', textShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>{score}</div>
                <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 700 }}>もん せいかい！</div>
              </div>

              {score > (timeAttackBestScores[timeLimit] || 0) && (
                <div style={{ marginBottom: '2rem', padding: '0.75rem', background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', color: '#b45309', borderRadius: '12px', fontWeight: 800, animation: 'pulse 1.5s infinite', border: '1px solid #fde68a', boxShadow: '0 4px 6px rgba(251, 191, 36, 0.2)' }}>
                  🎊 しんきろく たっせい！ 🎊
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <button 
                  onClick={() => {
                    if (score > (timeAttackBestScores[timeLimit] || 0)) {
                      const newBestScores = { ...timeAttackBestScores, [timeLimit]: score };
                      setTimeAttackBestScores(newBestScores);
                      localStorage.setItem('timeAttackBestScores', JSON.stringify(newBestScores));
                    }
                    startGame('choice', quizCategory, true);
                  }} 
                  className="btn-primary"
                  style={{ padding: '1rem', fontSize: '1.1rem' }}
                >
                  もういちど ちょうせん
                </button>
                <button 
                  onClick={() => {
                    if (score > (timeAttackBestScores[timeLimit] || 0)) {
                      const newBestScores = { ...timeAttackBestScores, [timeLimit]: score };
                      setTimeAttackBestScores(newBestScores);
                      localStorage.setItem('timeAttackBestScores', JSON.stringify(newBestScores));
                    }
                    resetGame();
                  }} 
                  className="btn-secondary"
                  style={{ padding: '1rem' }}
                >
                  おわる
                </button>
              </div>
            </div>
          </div>
        )}

        {showAbout && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200 }}>
            <div className="glass-panel bounce-in" style={{ padding: '1.5rem', textAlign: 'left', width: '90%', maxWidth: '400px', maxHeight: '80%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>❓ あそびかた</h2>
                <button onClick={() => setShowAbout(false)} className="btn-secondary" style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>❌</button>
              </div>

              <div className="scroll-area" style={{ flex: 1, paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <section>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>🎮</span> クイズの モード
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}><span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>🎯 えらぶ</span>: 4つの なまえから せいかいを えらぼう！</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}><span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>⌨️ かく</span>: キーボードで ポケモンの なまえを いれよう！</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}><span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>🔈 こえ</span>: ポケモンの なきごえだけで なまえを あてよう！</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}><span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>🧪 タイプ</span>: ポケモンの 「じゃくてん」を あてよう！</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}><span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>🔄 しりとり</span>: AIと ポケモンの なまえで しりとりバトル！</div>
                  </div>
                </section>

                <section>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>📈</span> レベルと 称号
                  </h3>
                  <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(0,0,0,0.03)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                    せいかいするたびに けいけんちが たまるよ！<br />
                    5もん せいかいするごとに <strong>レベルアップ！</strong><br />
                    「ジムリーダー」や 「チャンピオン」を めざして がんばろう！
                  </div>
                </section>

                <section>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>📱</span> アプリにする (PWA)
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <p style={{ fontWeight: 800, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>🍏 iPhone / iPad</p>
                      <p>Safariの「共有ボタン（四角と矢印）」→ <strong>「ホーム画面に追加」</strong></p>
                    </div>
                    <div>
                      <p style={{ fontWeight: 800, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>🤖 Android / Chrome</p>
                      <p>「︙」メニュー → <strong>「アプリをインストール」</strong></p>
                    </div>
                  </div>
                </section>

                <button 
                  onClick={() => setShowAbout(false)}
                  className="btn-primary"
                  style={{ width: '100%', padding: '1rem', marginTop: '0.5rem' }}
                >
                  わかった！
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
