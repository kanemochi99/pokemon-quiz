import React, { useState } from 'react';

interface TextInputProps {
  onAnswer: (answer: string) => void;
  disabled: boolean;
}

const TextInput: React.FC<TextInputProps> = ({ onAnswer, disabled }) => {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onAnswer(value.trim());
      setValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder="ポケモンの名前を入力..."
        style={{
          flex: 1,
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #ccc',
          fontSize: '1rem',
          background: 'rgba(255, 255, 255, 0.9)',
        }}
        autoFocus
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        style={{ background: '#646cff', color: 'white', minWidth: '80px' }}
      >
        回答
      </button>
    </form>
  );
};

export default TextInput;
