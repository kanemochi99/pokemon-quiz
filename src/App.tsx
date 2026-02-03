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
    await fetchAllPokemonNames();
  };

  const handleShiritoriSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = shiritoriInput.trim();
    if (!input || isAiThinking || shiritoriWinner) return;

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

  const renderHomeTab = () => (
    <div className="fade-in">
      {previewPokemon && (
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <img src={previewPokemon.image} alt="" style={{ width: '120px', height: '120px', objectFit: 'contain', opacity: 0.8 }} />
        </div>
      )}
      {renderHeader('🎮 ポケモンクイズ')}
      
      <div className="mode-card" style={{ background: 'var(--bg-gray)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: 'white', padding: '0.5rem', borderRadius: '12px', minWidth: '60px', textAlign: 'center', fontWeight: 800 }}>
          <div style={{ fontSize: '0.6rem', opacity: 0.9 }}>Lv.</div>
          <div style={{ fontSize: '1.25rem' }}>{getLevelInfo(totalCorrectCount).level}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.25rem' }}>{getTrainerTitle(getLevelInfo(totalCorrectCount).level)}</div>
          <div style={{ width: '100%', height: '6px', background: 'var(--bg-panel)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${getLevelInfo(totalCorrectCount).progressPercent}%`, height: '100%', background: 'var(--primary-color)', transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', textAlign: 'center' }}>もんだいの だしかた</p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', background: 'var(--bg-gray)', padding: '0.4rem', borderRadius: '14px' }}>
           {['illustration', 'silhouette', 'cry'].map(mode => (
             <button 
               key={mode}
               onClick={() => setDisplayMode(mode as any)}
               style={{ 
                 flex: 1, padding: '0.6rem', borderRadius: '10px', fontSize: '0.875rem',
                 background: displayMode === mode ? 'var(--primary-color)' : 'transparent',
                 color: displayMode === mode ? 'white' : 'var(--text-secondary)',
                 boxShadow: 'none'
               }}
             >
               {mode === 'illustration' ? '📸 え' : mode === 'silhouette' ? '👤 かげ' : '🔊 こえ'}
             </button>
           ))}
        </div>
      </div>

      <div className="mode-card" style={{ background: 'linear-gradient(135deg, #6e8efb, #a777e3)', border: 'none', color: 'white' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'white' }}>🎯 クイズに ちょうせん</h3>
        <p style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '1rem' }}>せいかいして ポケモンを つかまえよう！</p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => startGame('choice')} style={{ flex: 1, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }}>
            えらぶ
          </button>
          <button onClick={() => startGame('input')} style={{ flex: 1, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }}>
            かく
          </button>
        </div>
      </div>

      <div className="mode-card" style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)', border: 'none', color: 'white' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'white' }}>🔄 しりとりバトル</h3>
        <p style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '1rem' }}>AIと しりとりで たたかおう！</p>
        <button onClick={startShiritori} style={{ width: '100%', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }}>
          バトルを はじめる
        </button>
      </div>
    </div>
  );

  const renderSpeedTab = () => (
    <div className="fade-in">
      {renderHeader('⚡ タイムアタック', '制限時間内に 何問 せいかいできるかな？')}
      
      <div style={{ background: 'var(--bg-gray)', padding: '1.25rem', borderRadius: '24px', marginBottom: '1.5rem', border: '2px solid var(--border-color)' }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 800, marginBottom: '0.75rem', textAlign: 'center' }}>じかんを えらぶ</p>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-panel)', padding: '0.3rem', borderRadius: '12px' }}>
          {[30, 60, 120].map(time => (
            <button 
              key={time}
              onClick={() => setTimeLimit(time)}
              style={{ 
                flex: 1, padding: '0.6rem', borderRadius: '10px', fontSize: '0.875rem',
                background: timeLimit === time ? 'var(--primary-color)' : 'transparent',
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
          style={{ padding: '1.25rem', fontSize: '1.25rem', background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: 'white', borderRadius: '24px' }}
        >
          ⚡ えらんで チャレンジ
        </button>
        <button 
          onClick={() => startGame('input', 'name', true)}
          style={{ padding: '1.25rem', fontSize: '1.25rem', background: 'linear-gradient(135deg, #FF8C00, #FF4500)', color: 'white', borderRadius: '24px' }}
        >
          🔥 かいて チャレンジ
        </button>
      </div>
    </div>
  );

  const renderBookTab = () => (
    <div className="fade-in">
      {renderHeader('📖 ポケモンずかん', `${caughtPokemon.length} ぴき つかまえたよ！`)}
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '0.75rem', maxHeight: '60vh', overflowY: 'auto', padding: '0.5rem', background: 'var(--bg-gray)', borderRadius: '20px' }}>
        {caughtPokemon.sort((a,b) => a-b).map(id => (
          <div key={id} style={{ background: 'var(--bg-panel)', borderRadius: '16px', padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
            <img 
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`} 
              alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'contain' }} 
            />
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.3rem', fontWeight: 800 }}>#{String(id).padStart(3, '0')}</div>
          </div>
        ))}
        {caughtPokemon.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
            まだ 1ぴきも つかまえていないよ。<br />クイズで つかまえよう！
          </div>
        )}
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="fade-in">
      {renderHeader('⚙️ せってい')}
      
      <div className="mode-card">
        <p style={{ fontSize: '0.875rem', fontWeight: 800, marginBottom: '0.75rem' }}>テーマ（いろ）</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          {THEMES.map((t) => (
            <div 
              key={t.id}
              className={`theme-circle ${theme === t.id ? 'active' : ''}`}
              style={{ backgroundColor: t.color, width: '32px', height: '32px', border: t.id === 'light' ? '1px solid #ddd' : 'none' }}
              onClick={() => setTheme(t.id)}
            />
          ))}
        </div>
      </div>

      <div className="mode-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
           <p style={{ fontSize: '0.875rem', fontWeight: 800 }}>もんだいの フィルター</p>
           <button onClick={() => setShowFilters(!showFilters)} style={{ fontSize: '0.75rem', background: 'none', color: 'var(--primary-color)', textDecoration: 'underline', padding: 0, boxShadow: 'none' }}>
             {showFilters ? 'とじる' : 'ひらく'}
           </button>
        </div>
        
        {showFilters && (
          <div className="fade-in">
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>ちほう</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.25rem', marginBottom: '1rem' }}>
              {['all', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map(gen => (
                <button key={gen} onClick={() => setSelectedGen(gen)} style={{ padding: '0.4rem 0', fontSize: '0.65rem', background: selectedGen === gen ? 'var(--primary-color)' : 'var(--bg-panel)', color: selectedGen === gen ? 'white' : 'var(--text-primary)', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
                  {REGION_NAME_MAP[gen]}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>タイプ</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.25rem' }}>
              <button onClick={() => setSelectedType('all')} style={{ gridColumn: 'span 2', padding: '0.4rem 0', fontSize: '0.65rem', background: selectedType === 'all' ? 'var(--primary-color)' : 'var(--bg-panel)', color: selectedType === 'all' ? 'white' : 'var(--text-primary)', border: '1px solid var(--border-color)', boxShadow: 'none', borderRadius: '6px' }}>
                すべて
              </button>
              {Object.entries(TYPE_NAME_MAP).map(([en, ja]) => (
                <button key={en} onClick={() => setSelectedType(en)} style={{ padding: '0.4rem 0', fontSize: '0.6rem', background: selectedType === en ? 'var(--primary-color)' : 'var(--bg-panel)', color: selectedType === en ? 'white' : 'var(--text-primary)', border: '1px solid var(--border-color)', boxShadow: 'none', borderRadius: '6px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  {ja}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button 
        onClick={handleShare}
        style={{ width: '100%', padding: '1rem', borderRadius: '16px', background: 'var(--bg-panel)', border: '2px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
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

  const normalizeLastChar = (name: string) => {
    const smallToLarge: Record<string, string> = {
      'ァ': 'ア', 'ィ': 'イ', 'ゥ': 'ウ', 'ェ': 'エ', 'ォ': 'オ',
      'ッ': 'ツ', 'ャ': 'ヤ', 'ュ': 'ユ', 'ョ': 'ヨ', 'ヮ': 'ワ',
    };
    const last = name.slice(-1);
    if (last === 'ー') {
      const charBefore = name.slice(-2, -1);
      const jaVowels: Record<string, string> = {
        'ア': 'ア', 'カ': 'ア', 'サ': 'ア', 'タ': 'ア', 'ナ': 'ア', 'ハ': 'ア', 'マ': 'ア', 'ヤ': 'ア', 'ラ': 'ア', 'ワ': 'ア', 'ガ': 'ア', 'ザ': 'ア', 'ダ': 'ア', 'バ': 'ア', 'パ': 'ア',
        'イ': 'イ', 'キ': 'イ', 'シ': 'イ', 'チ': 'イ', 'ニ': 'イ', 'ヒ': 'イ', 'ミ': 'イ', 'リ': 'イ', 'ギ': 'イ', 'ジ': 'イ', 'ヂ': 'イ', 'ビ': 'イ', 'ピ': 'イ',
        'ウ': 'ウ', 'ク': 'ウ', 'ス': 'ウ', 'ツ': 'ウ', 'ヌ': 'ウ', 'フ': 'ウ', 'ム': 'ウ', 'ユ': 'ウ', 'ル': 'ウ', 'グ': 'ウ', 'ズ': 'ウ', 'ヅ': 'ウ', 'ブ': 'ウ', 'プ': 'ウ',
        'エ': 'エ', 'ケ': 'エ', 'セ': 'エ', 'テ': 'エ', 'ネ': 'エ', 'ヘ': 'エ', 'メ': 'エ', 'レ': 'エ', 'ゲ': 'エ', 'ゼ': 'エ', 'デ': 'エ', 'ベ': 'エ', 'ペ': 'エ',
        'オ': 'オ', 'コ': 'オ', 'ソ': 'オ', 'ト': 'オ', 'ノ': 'オ', 'ホ': 'オ', 'モ': 'オ', 'ヨ': 'オ', 'ロ': 'オ', 'ゴ': 'オ', 'ゾ': 'オ', 'ド': 'オ', 'ボ': 'オ', 'ポ': 'オ'
      };
      return jaVowels[charBefore] || charBefore;
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

  // Start Screen
  // Start Screen / Navigation
  if (!gameMode && !isShiritori) {
    return (
      <div className="app-container tab-content">
        <div className="glass-panel" style={{ padding: '1.5rem', width: '100%', maxWidth: '500px' }}>
          {activeTab === 'home' && renderHomeTab()}
          {activeTab === 'speed' && renderSpeedTab()}
          {activeTab === 'book' && renderBookTab()}
          {activeTab === 'settings' && renderSettingsTab()}
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
          <div className="fade-in" style={{ position: 'fixed', bottom: '6rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '30px', fontSize: '0.875rem', fontWeight: 600, zIndex: 200, pointerEvents: 'none' }}>
            ✅ URLを コピーしたよ！
          </div>
        )}
      </div>
    );
  }

  // Shiritori Screen
  if (isShiritori) {
    return (
      <div className="app-container">
        <div className="glass-panel" style={{ padding: '1.5rem', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', height: '90vh', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <button onClick={() => setIsShiritori(false)} style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-gray)', fontSize: '0.8rem', borderRadius: '8px', boxShadow: 'none' }}>
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
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem', marginBottom: '1rem' }}>
                {shiritoriHistory.length === 0 && (
                  <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🗣️</div>
                    <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>しりとりを はじめよう！</p>
                    <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>しっている ポケモンの なまえを<br />したの はこに いれてね。</p>
                  </div>
                )}
                {shiritoriHistory.map((chat, i) => (
                  <div key={i} className="fade-in" style={{ display: 'flex', justifyContent: chat.sender === 'player' ? 'flex-end' : 'flex-start', alignItems: 'center', gap: '0.5rem' }}>
                    {chat.sender === 'ai' && (
                      <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '50%', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <img src={chat.image} alt="" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                      </div>
                    )}
                    <div style={{ 
                      maxWidth: '75%', 
                      padding: '0.75rem 1rem', 
                      borderRadius: '18px', 
                      background: chat.sender === 'player' ? 'var(--primary-color)' : 'white',
                      color: chat.sender === 'player' ? 'white' : 'var(--text-primary)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      border: chat.sender === 'ai' ? '1px solid var(--border-color)' : 'none',
                      fontWeight: 700,
                      fontSize: '1rem'
                    }}>
                      {chat.name}
                    </div>
                    {chat.sender === 'player' && (
                      <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '50%', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
                <div id="shiritori-bottom" style={{ height: '20px' }}></div>
              </div>

              {shiritoriWinner ? (
                <div className="fade-in" style={{ background: 'var(--bg-gray)', padding: '1.5rem', borderRadius: '16px', textAlign: 'center', marginBottom: '1rem', border: '2px solid var(--border-color)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{shiritoriWinner === 'player' ? '🏆' : '💦'}</div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                    {shiritoriWinner === 'player' ? 'きみの かち！' : 'AIの かち！'}
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                    {shiritoriWinner === 'player' ? 'AIは もう なまえが おもいつかないみたい！' : '「ン」がついちゃったね。'}
                  </p>
                  <button onClick={startShiritori} style={{ width: '100%', padding: '1rem', background: 'var(--primary-color)', color: 'white', fontWeight: 800, borderRadius: '12px', fontSize: '1.1rem' }}>
                    もういっかい！
                  </button>
                </div>
              ) : (
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
                    placeholder="なまえを いれてね"
                    style={{ flex: 1, padding: '1rem', borderRadius: '14px', border: '2px solid var(--border-color)', fontSize: '1rem', outline: 'none', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                  />
                  <button type="submit" disabled={!shiritoriInput.trim() || isAiThinking} style={{ padding: '0 1.5rem', background: 'var(--primary-color)', color: 'white', borderRadius: '14px', fontWeight: 800, fontSize: '1rem' }}>
                    OK
                  </button>
                </form>
              )}
            </>
          )}
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
          {timeLeft !== null && (
            <div style={{ 
              fontSize: '1.5rem', 
              fontWeight: 800, 
              color: timeLeft <= 10 ? 'var(--error)' : 'var(--text-primary)',
              background: 'var(--bg-gray)',
              padding: '0.25rem 0.75rem',
              borderRadius: '8px',
              border: '2px solid',
              borderColor: timeLeft <= 10 ? 'var(--error)' : 'var(--border-color)',
              marginBottom: '0.5rem',
              animation: timeLeft <= 10 ? 'pulse 1s infinite' : 'none'
            }}>
              ⏱️ {timeLeft}s
            </div>
          )}
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
            {quizCategory === 'type' ? 'このポケモンの「じゃくてん」はどれ？' : 
             (displayMode === 'cry' && !showResult ? 'この なきごえは だーれだ？' : 
              (displayMode === 'silhouette' ? 'ポケモン だーれだ？' : 'このポケモンの名前は？'))}
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
              <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 800 }}>{currentPokemon.name}</h1>
              
              <div style={{ marginBottom: '1.5rem', position: 'relative', display: 'inline-block' }}>
                <img 
                  src={currentPokemon.isShiny ? currentPokemon.shinyImage : currentPokemon.image} 
                  alt={currentPokemon.name} 
                  style={{ width: '180px', height: '180px', objectFit: 'contain' }} 
                />
                {currentPokemon.isShiny && (
                  <div className="shiny-sparkle" style={{ position: 'absolute', top: '0', right: '0', fontSize: '1.5rem', animation: 'spin 2s linear infinite' }}>✨</div>
                )}
              </div>
              
              <div style={{ background: 'var(--bg-gray)', padding: '1rem', borderRadius: '12px', textAlign: 'left', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                  {quizCategory === 'type' && (
                    <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-panel)', borderRadius: '8px', borderLeft: '4px solid var(--primary-color)' }}>
                      <span style={{ fontWeight: 800, color: 'var(--primary-color)' }}>{correctAnswer}</span> は 
                      <span style={{ fontWeight: 800 }}> {currentPokemon.name}</span> ({currentPokemon.types?.join('・')}) 
                      の じゃくてんだ！
                    </div>
                  )}
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
        {isTimeUp && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.7)', borderRadius: '16px', zIndex: 100, backdropFilter: 'blur(4px)' }}>
            <div className="glass-panel bounce-in" style={{ padding: '3rem 2rem', textAlign: 'center', background: 'var(--bg-panel)', width: '90%', maxWidth: '400px' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⏰</div>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>タイムアップ！</h2>
              <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                しゅうりょう！ きみの スコアは...
              </p>
              
              <div style={{ marginBottom: '2.5rem' }}>
                <div style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--primary-color)', lineHeight: '1' }}>{score}</div>
                <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>もん せいかい！</div>
              </div>

              {score > (timeAttackBestScores[timeLimit] || 0) && (
                <div style={{ marginBottom: '2rem', padding: '0.5rem', background: '#fef3c7', color: '#92400e', borderRadius: '8px', fontWeight: 700, animation: 'pulse 1s infinite' }}>
                  🎊 しんきろく たっせい！ 🎊
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <button 
                  onClick={() => {
                    // Update best score if needed
                    if (score > (timeAttackBestScores[timeLimit] || 0)) {
                      const newBestScores = { ...timeAttackBestScores, [timeLimit]: score };
                      setTimeAttackBestScores(newBestScores);
                      localStorage.setItem('timeAttackBestScores', JSON.stringify(newBestScores));
                    }
                    startGame(gameMode || 'choice', quizCategory, true);
                  }} 
                  style={{ background: 'var(--primary-color)', color: 'white', padding: '1rem', fontSize: '1.25rem', fontWeight: 700 }}
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
                  style={{ background: 'var(--bg-gray)', color: 'var(--text-primary)', padding: '1rem' }}
                >
                  おわる
                </button>
              </div>
            </div>
          </div>
        )}
        {showAbout && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.7)', borderRadius: '16px', zIndex: 200, backdropFilter: 'blur(4px)' }}>
            <div className="glass-panel bounce-in" style={{ padding: '2rem', textAlign: 'left', background: 'var(--bg-panel)', width: '90%', maxWidth: '500px', maxHeight: '85%', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>❓ あそびかた</h2>
                <button onClick={() => setShowAbout(false)} style={{ background: 'var(--bg-gray)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.875rem' }}>❌</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <section>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>🎮 クイズの モード</h3>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    <li><strong>🎯 えらぶ</strong>: 4つの なまえから せいかいを えらぼう！</li>
                    <li><strong>⌨️ かく</strong>: キーボードで ポケモンの なまえを いれよう！</li>
                    <li><strong>🔈 こえ</strong>: ポケモンの なきごえだけで なまえを あてよう！</li>
                    <li><strong>🧪 タイプ</strong>: ポケモンの 「じゃくてん」を あてよう！</li>
                    <li><strong>🔄 しりとり</strong>: AIと ポケモンの なまえで しりとりバトル！</li>
                  </div>
                </section>

                <section>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>📈 レベルと 称号</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    せいかいするたびに けいけんちが たまるよ！<br />
                    5もん せいかいするごとに <strong>レベルアップ！</strong><br />
                    「ジムリーダー」や 「チャンピオン」を めざして がんばろう！
                  </p>
                </section>

                <section>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>📱 アプリにする ほうほう (PWA)</h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-gray)', padding: '1rem', borderRadius: '12px' }}>
                    <p style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>🍏 iPhone / iPad</p>
                    <p style={{ marginBottom: '1rem' }}>Safariの「共有ボタン（四角と矢印）」を おして <strong>「ホーム画面に追加」</strong> をえらんでね！</p>
                    
                    <p style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>🤖 Android / Chrome</p>
                    <p style={{ marginBottom: '1rem' }}>「︙」メニューから <strong>「アプリをインストール」</strong> をえらんでね！</p>

                    <p style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>🔥 Fireタブレット</p>
                    <p>Silkブラウザの メニューから <strong>「ホーム画面に追加」</strong> をえらんでね！</p>
                  </div>
                </section>

                <button 
                  onClick={() => setShowAbout(false)}
                  style={{ width: '100%', padding: '1rem', background: 'var(--primary-color)', color: 'white', fontWeight: 700, fontSize: '1.1rem', marginTop: '1rem' }}
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
