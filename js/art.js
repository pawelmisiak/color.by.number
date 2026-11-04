// All pictures, grouped into categories, plus the difficulty levels.
// Each drawing file (js/art/*.js) exports a list of pictures; see shapes.js
// for the shape helpers. Picture ids must be unique across all categories,
// because saved progress is stored by id.

import animals from './art/animals.js';
import sea from './art/sea.js';
import dinos from './art/dinos.js';
import food from './art/food.js';
import vehicles from './art/vehicles.js';
import monsters from './art/monsters.js';
import blocky from './art/blocky.js';

export const CATEGORIES = [
  { id: 'animals', name: 'Funny Animals', emoji: '🐾', items: animals },
  { id: 'sea', name: 'Under the Sea', emoji: '🌊', items: sea },
  { id: 'dinos', name: 'Dino World', emoji: '🦖', items: dinos },
  { id: 'food', name: 'Silly Snacks', emoji: '🍩', items: food },
  { id: 'vehicles', name: 'Vroom Vroom', emoji: '🚗', items: vehicles },
  { id: 'monsters', name: 'Silly Monsters', emoji: '👾', items: monsters },
  { id: 'blocky', name: 'Blocky World', emoji: '🧱', items: blocky },
];

export const ALL = CATEGORIES.flatMap((cat) => cat.items.map((item) => ({ ...item, cat: cat.id })));

// Easy starts with magic fill once it has been unlocked.
export const LEVELS = [
  { id: 'easy', name: 'Easy', emoji: '🐣', size: 16, tool: 'bucket', blurb: 'Big squares to start with' },
  { id: 'medium', name: 'Medium', emoji: '🐥', size: 24, tool: 'brush', blurb: 'More squares to paint' },
  { id: 'hard', name: 'Hard', emoji: '🦅', size: 32, tool: 'brush', blurb: 'Tiny squares, big challenge' },
  { id: 'super', name: 'Super Hard', emoji: '🚀', size: 48, tool: 'brush', blurb: 'Super tiny squares for pros' },
];
