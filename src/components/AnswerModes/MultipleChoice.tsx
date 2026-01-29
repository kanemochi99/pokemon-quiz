import React from 'react';

interface MultipleChoiceProps {
  choices: string[];
  onAnswer: (answer: string) => void;
  disabled: boolean;
}

const MultipleChoice: React.FC<MultipleChoiceProps> = ({ choices, onAnswer, disabled }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', marginTop: '1rem' }}>
      {choices.map((choice, index) => (
        <button
          key={`${choice}-${index}`}
          onClick={() => onAnswer(choice)}
          disabled={disabled}
          style={{ 
            padding: '1rem', 
            fontSize: '1rem', 
            background: 'rgba(255, 255, 255, 0.8)',
            color: '#333',
            border: '1px solid #ddd',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {choice}
        </button>
      ))}
    </div>
  );
};

export default MultipleChoice;
