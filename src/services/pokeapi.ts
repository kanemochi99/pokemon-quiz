import { Pokemon, QuizQuestion } from '../types/pokemon';

const MAX_POKEMON_ID = 1025; // Gen 9 included

const getRandomId = () => Math.floor(Math.random() * MAX_POKEMON_ID) + 1;

interface PokemonSpeciesResponse {
  names: {
    language: { name: string };
    name: string;
  }[];
}

interface PokemonDataResponse {
  sprites: {
    other: {
      'official-artwork': {
        front_default: string;
      };
    };
  };
}

const fetchPokemonName = async (id: number): Promise<string> => {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
  if (!response.ok) throw new Error('Failed to fetch species data');
  const data: PokemonSpeciesResponse = await response.json();
  const jaName = data.names.find((n) => n.language.name === 'ja')?.name;
  return jaName || 'New Pokemon'; // Fallback
};

const fetchPokemonImage = async (id: number): Promise<string> => {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  if (!response.ok) throw new Error('Failed to fetch pokemon data');
  const data: PokemonDataResponse = await response.json();
  return data.sprites.other['official-artwork'].front_default;
};

export const fetchRandomPokemon = async (): Promise<Pokemon> => {
  const id = getRandomId();
  try {
    const [name, image] = await Promise.all([
      fetchPokemonName(id),
      fetchPokemonImage(id),
    ]);
    return { id, name, image };
  } catch (error) {
    console.error('Error fetching pokemon:', error);
    // Retry once if failed (simple retry logic)
    const newId = getRandomId();
    const [name, image] = await Promise.all([
        fetchPokemonName(newId),
        fetchPokemonImage(newId),
      ]);
    return { id: newId, name, image };
  }
};

export const fetchQuizData = async (): Promise<QuizQuestion> => {
  // Fetch correct pokemon
  const correctPokemon = await fetchRandomPokemon();

  // Fetch 3 wrong choices (names only)
  const wrongPromises = [];
  while (wrongPromises.length < 3) {
      const id = getRandomId();
      if (id !== correctPokemon.id) {
          wrongPromises.push(fetchPokemonName(id));
      }
  }
  
  const wrongNames = await Promise.all(wrongPromises);
  
  // Shuffle choices
  const choices = [...wrongNames, correctPokemon.name].sort(() => Math.random() - 0.5);

  return {
    correctPokemon,
    choices,
  };
};
