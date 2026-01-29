import React from 'react';
import { GameState } from '../types/pokemon';
import MultipleChoice from './AnswerModes/MultipleChoice';
import TextInput from './AnswerModes/TextInput';
import ResultFeedback from './ResultFeedback';

interface QuizScreenProps {
  gameState: GameState;
  onAnswer: (answer: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const QuizScreen: React.FC<QuizScreenProps> = ({ gameState, onAnswer, onNext, onBack }) => {
  const { currentPokemon, isLoading, choices, gameMode, showResult, isCorrect, score, totalQuestions } = gameState;

  if (isLoading && !currentPokemon) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!currentPokemon) return null;

  return (
    <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '600px', position: 'relative' }}>
      <button 
        onClick={onBack}
        style={{ position: 'absolute', top: '1rem', left: '1rem', padding: '0.5rem', fontSize: '0.8rem' }}
      >
        戻る
      </button>

      <div style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '1rem', fontWeight: 'bold' }}>
        スコア: {score} / {totalQuestions}
      </div>

      <div style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '1rem' }}>
        <img
          key={currentPokemon.id}
          src={currentPokemon.image}
          alt="Pokemon"
          style={{ width: '250px', height: '250px', objectFit: 'contain', filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.2))' }}
        />
        <h3 style={{ marginTop: '1rem', opacity: 0.6 }}>このポケモンの名前は？</h3>
      </div>

      {gameMode === 'choice' && (
        <MultipleChoice 
          choices={choices} 
          onAnswer={onAnswer} 
          disabled={showResult}
        />
      )}

      {gameMode === 'input' && (
        <TextInput 
          onAnswer={onAnswer} 
          disabled={showResult}
        />
      )}

      {showResult && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '16px' }}>
          <ResultFeedback 
            isCorrect={!!isCorrect} 
            correctName={currentPokemon.name} 
            onNext={onNext} 
          />
        </div>
      )}
    </div>
  );
};

export default QuizScreen;
