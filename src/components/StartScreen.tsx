import React from 'react';
import { GameMode } from '../types/pokemon';

interface StartScreenProps {
  onStart: (mode: GameMode) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  return (
    <div 
      className="glass-panel start-screen"
      style={{ padding: '3rem', textAlign: 'center' }}
    >
      <h1 
        style={{ fontSize: '2.5rem', marginBottom: '2rem', background: 'linear-gradient(45deg, #FFD700, #FF4500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
      >
        ポケモンクイズ
      </h1>
      
      <p style={{ marginBottom: '2rem', fontSize: '1.2rem', opacity: 0.8 }}>
        モードを選んでスタート！
      </p>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => onStart('choice')}
          style={{ padding: '1rem 2rem', fontSize: '1.1rem', background: '#4CAF50', color: 'white' }}
        >
          選択肢モード
        </button>

        <button
          onClick={() => onStart('input')}
          style={{ padding: '1rem 2rem', fontSize: '1.1rem', background: '#2196F3', color: 'white' }}
        >
          入力モード
        </button>
      </div>
    </div>
  );
};

export default StartScreen;
