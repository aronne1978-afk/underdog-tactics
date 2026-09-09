export type Difficulty = 'Storico' | 'Realistico' | 'Eroico' | 'Mitico';
export type BattleMode = 'underdog' | 'invader';
export type PhaseType = 'player' | 'resolve' | 'enemy' | 'combat' | 'event' | 'end';

/**
 * Statistic definition in a battle
 */
export interface StatDefinition {
  id: string;
  label: string;
  initialValue: number;
  maxValue: number;
  unit: string;
  isEnemy: boolean; // true = trend flipped (▲ is bad, ▼ is good)
  iconSvg: string; // 24x24 viewBox, fill="currentColor"
  trendEnabled: boolean;
}

/**
 * Zone on the map
 */
export interface ZoneDefinition {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  initialOwner: 'underdog' | 'enemy' | 'neutral';
}

/**
 * Enemy AI action
 */
export interface EnemyAction {
  id: string;
  description: string;
  condition: string; // JS-like condition: "stats.morale.value < 30"
  cost?: { stat: string; value: number }; // Deduct from enemy stat
  effect: (state: GameState) => Partial<GameState>; // Mutation function
  priority: number; // Higher = evaluated first
}

/**
 * Event triggered during battle
 */
export interface EventDefinition {
  id: string;
  name: string;
  trigger: string; // Condition when event fires
  description: string; // Template: "${underdog} has lost ${casualty} warriors"
  effect?: (state: GameState) => Partial<GameState>;
}

/**
 * Prompt chips for player actions
 */
export interface PromptChip {
  text: string;
  stat?: string; // Which stat this action targets
}

/**
 * Complete battle configuration (loaded from .config.ts files)
 */
export interface BattleConfig {
  id: string;
  name: string;
  year: number;
  underdogFaction: string;
  invaderFaction: string;
  description: string;
  
  // Map & zones
  mapWidth: number;
  mapHeight: number;
  zones: ZoneDefinition[];
  
  // Stats
  stats: StatDefinition[];
  
  // Rules
  maxTurns: number;
  victoryConditions: Array<{
    check: (state: GameState) => boolean;
    name: string;
  }>;
  defeatConditions: Array<{
    check: (state: GameState) => boolean;
    name: string;
  }>;
  
  // Difficulty modifiers
  difficultyModifiers: Record<Difficulty, DifficultyModifier>;
  
  // Enemy AI
  enemyAI: EnemyAction[];
  
  // Events
  events: EventDefinition[];
  
  // Prompt chips by stat
  promptChips: Record<string, PromptChip[]>;
}

export interface DifficultyModifier {
  statsMultiplier: number; // e.g., 1.15 for +15%
  maxTurnsAdjustment: number; // e.g., +1 for extra turn
  enemyBehaviorAggressiveness: number; // 1.0 = neutral, 1.5 = 50% more aggressive
  eventTriggerMultiplier: number; // 1.0 = normal, 2.0 = double frequency
}

/**
 * Stat value at current turn
 */
export interface StatValue {
  id: string;
  current: number;
  previous: number;
  max: number;
}

/**
 * Current game state
 */
export interface GameState {
  battleId: string;
  mode: BattleMode;
  difficulty: Difficulty;
  
  turn: number;
  maxTurns: number;
  phase: PhaseType;
  
  stats: Record<string, StatValue>; // e.g., { warriors: { current: 3500, previous: 3800, max: 3800 }, ... }
  zones: Record<string, { owner: 'underdog' | 'enemy' | 'neutral' }>; // Zone ownership
  
  log: LogEntry[];
  victory: boolean | null; // null = ongoing, true = underdog won, false = underdog lost
  gameOver: boolean;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}

export interface LogEntry {
  turn: number;
  phase: PhaseType;
  timestamp: string;
  type: 'action' | 'event' | 'combat' | 'status';
  message: string;
}

/**
 * Player order (from chip or free text)
 */
export interface PlayerOrder {
  action: string;
  statId?: string;
  target?: string; // Zone or enemy unit
  cost?: { stat: string; value: number };
}

/**
 * Parsed order from Gemini API
 */
export interface ParsedOrder extends PlayerOrder {
  confidence: number; // 0-1
  fallbackChip?: string; // If low confidence
}