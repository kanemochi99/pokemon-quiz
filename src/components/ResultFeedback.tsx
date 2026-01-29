import React from 'react';

interface ResultFeedbackProps {
  isCorrect: boolean;
  correctName: string;
  onNext: () => void;
}

const ResultFeedback: React.FC<ResultFeedbackProps> = ({ isCorrect, correctName, onNext }) => {
  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        padding: '2rem',
        textAlign: 'center',
        zIndex: 10,
        background: isCorrect ? 'rgba(220, 255, 220, 0.95)' : 'rgba(255, 220, 220, 0.95)',
        border: isCorrect ? '2px solid #4CAF50' : '2px solid #F44336',
        width: '80%',
        maxWidth: '400px',
      }}
    >
      <h2
        style={{ 
          fontSize: '2rem', 
          color: isCorrect ? '#2E7D32' : '#C62828',
          marginBottom: '1rem' 
        }}
      >
        {isCorrect ? '正解！' : '残念...'}
      </h2>
      
      <p style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>
        正解は <strong>{correctName}</strong> です！
      </p>

      <button
        onClick={onNext}
        style={{
          background: '#1a1a1a',
          color: 'white',
          padding: '1rem 2rem',
          fontSize: '1.1rem',
        }}
      >
        次の問題へ
      </button>
    </div>
  );
};

export default ResultFeedback;
