import {
  BattleConfig,
  BattleMode,
  Difficulty,
  GameState,
  LogEntry,
  PhaseType,
  PlayerOrder,
  StatValue,
} from './types';

export class BattleEngine {
  private config: BattleConfig;
  private state: GameState;
  private mode: BattleMode;
  private difficulty: Difficulty;

  constructor(config: BattleConfig, mode: BattleMode, difficulty: Difficulty) {
    this.config = config;
    this.mode = mode;
    this.difficulty = difficulty;
    this.state = this.initializeState();
  }

  /**
   * Initialize game state with difficulty modifiers applied
   */
  private initializeState(): GameState {
    const modifier = this.config.difficultyModifiers[this.difficulty];
    const stats: Record<string, StatValue> = {};

    // Apply difficulty modifiers to stats
    for (const statDef of this.config.stats) {
      const adjustedValue = Math.round(statDef.initialValue * modifier.statsMultiplier);
      stats[statDef.id] = {
        id: statDef.id,
        current: adjustedValue,
        previous: adjustedValue,
        max: statDef.maxValue,
      };
    }

    // Initialize zones
    const zones: Record<string, { owner: 'underdog' | 'enemy' | 'neutral' }> = {};
    for (const zone of this.config.zones) {
      zones[zone.id] = { owner: zone.initialOwner };
    }

    const maxTurns = this.config.maxTurns + modifier.maxTurnsAdjustment;

    return {
      battleId: this.config.id,
      mode: this.mode,
      difficulty: this.difficulty,
      turn: 1,
      maxTurns,
      phase: 'player',
      stats,
      zones,
      log: [],
      victory: null,
      gameOver: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Execute one full turn: player → resolve → enemy → combat → event → end
   */
  async executeTurn(playerOrder: PlayerOrder): Promise<GameState> {
    if (this.state.gameOver) {
      throw new Error('Battle is already over');
    }

    // PHASE 1: PLAYER
    await this.playerPhase(playerOrder);
    if (this.checkVictory() || this.checkDefeat()) {
      this.state.gameOver = true;
      this.state.victory = this.checkVictory();
      return this.state;
    }

    // PHASE 2: RESOLVE
    await this.resolvePhase();
    if (this.checkVictory() || this.checkDefeat()) {
      this.state.gameOver = true;
      this.state.victory = this.checkVictory();
      return this.state;
    }

    // PHASE 3: ENEMY
    await this.enemyPhase();
    if (this.checkVictory() || this.checkDefeat()) {
      this.state.gameOver = true;
      this.state.victory = this.checkVictory();
      return this.state;
    }

    // PHASE 4: COMBAT
    await this.combatPhase();
    if (this.checkVictory() || this.checkDefeat()) {
      this.state.gameOver = true;
      this.state.victory = this.checkVictory();
      return this.state;
    }

    // PHASE 5: EVENT
    await this.eventPhase();
    if (this.checkVictory() || this.checkDefeat()) {
      this.state.gameOver = true;
      this.state.victory = this.checkVictory();
      return this.state;
    }

    // PHASE 6: END
    await this.endPhase();
    if (this.checkVictory() || this.checkDefeat()) {
      this.state.gameOver = true;
      this.state.victory = this.checkVictory();
      return this.state;
    }

    this.state.turn++;
    this.state.updatedAt = Date.now();
    return this.state;
  }

  /**
   * PHASE 1: Player executes order
   */
  private async playerPhase(order: PlayerOrder): Promise<void> {
    this.state.phase = 'player';
    this.addLog('action', `Player order: ${order.action}`);

    // Apply order effects (stat modifications, zone captures, etc.)
    if (order.cost) {
      const stat = this.state.stats[order.cost.stat];
      if (stat) {
        stat.previous = stat.current;
        stat.current = Math.max(0, stat.current - order.cost.value);
      }
    }
  }

  /**
   * PHASE 2: Resolve ongoing effects (stamina recovery, etc.)
   */
  private async resolvePhase(): Promise<void> {
    this.state.phase = 'resolve';
    // Subclass or config can define resolution rules
  }

  /**
   * PHASE 3: Enemy takes action
   */
  private async enemyPhase(): Promise<void> {
    this.state.phase = 'enemy';
    const modifier = this.config.difficultyModifiers[this.difficulty];

    // Find highest-priority action whose condition is met
    const sortedActions = [...this.config.enemyAI].sort(
      (a, b) => b.priority - a.priority
    );

    for (const action of sortedActions) {
      if (this.evaluateCondition(action.condition)) {
        this.addLog('action', `Enemy: ${action.description}`);

        // Apply effect
        if (action.effect) {
          const effect = action.effect(this.state);
          Object.assign(this.state, effect);
        }

        // Apply cost (enemy stat loss)
        if (action.cost) {
          const enemyStat = this.state.stats[action.cost.stat];
          if (enemyStat) {
            enemyStat.previous = enemyStat.current;
            enemyStat.current = Math.max(0, enemyStat.current - action.cost.value);
          }
        }
        break; // Only one action per turn
      }
    }
  }

  /**
   * PHASE 4: Combat resolution
   */
  private async combatPhase(): Promise<void> {
    this.state.phase = 'combat';
    // Deterministic combat calculations
  }

  /**
   * PHASE 5: Event (random or triggered)
   */
  private async eventPhase(): Promise<void> {
    this.state.phase = 'event';
    // Trigger events based on current state
  }

  /**
   * PHASE 6: End of turn (Odds recalculation, turn increment)
   */
  private async endPhase(): Promise<void> {
    this.state.phase = 'end';
    this.recalculateOdds();
  }

  /**
   * Evaluate condition strings like "stats.morale.value < 30"
   */
  private evaluateCondition(condition: string): boolean {
    try {
      // Create a safe context with state.stats accessible
      const contextStr = `
        const stats = ${JSON.stringify(this.state.stats)};
        return ${condition};
      `;
      const fn = new Function(contextStr);
      return fn();
    } catch (e) {
      console.error('Condition evaluation error:', e, 'Condition:', condition);
      return false;
    }
  }

  /**
   * Check victory conditions
   */
  private checkVictory(): boolean {
    return this.config.victoryConditions.some((vc) => vc.check(this.state));
  }

  /**
   * Check defeat conditions
   */
  private checkDefeat(): boolean {
    return this.config.defeatConditions.some((dc) => dc.check(this.state));
  }

  /**
   * Recalculate dynamic "Odds" statistic
   */
  private recalculateOdds(): void {
    const oddsStat = this.state.stats['odds'];
    if (!oddsStat) return;

    let odds = 5; // Base storico

    // Positive factors
    const morale = this.state.stats['morale'];
    if (morale && morale.current > 70) odds += 15;

    const enemy = this.state.stats['enemy'];
    if (enemy && enemy.current < enemy.max * 0.5) odds += 20;

    // Count zones
    const underdogZones = Object.values(this.state.zones).filter(
      (z) => z.owner === 'underdog'
    ).length;
    const totalZones = Object.keys(this.state.zones).length;
    if (underdogZones > totalZones * 0.5) odds += 10;

    // Turn progress
    if (this.state.turn < this.state.maxTurns * 0.5 && this.checkVictory()) {
      odds += 10;
    }

    // Negative factors
    if (morale && morale.current < 30) odds -= 20;

    const men = this.state.stats['warriors'] || this.state.stats['defenders'];
    if (men && men.current < men.max * 0.3) odds -= 15;

    if (this.state.turn > this.state.maxTurns * 0.8) odds -= 10;

    // Clamp 0-100
    oddsStat.previous = oddsStat.current;
    oddsStat.current = Math.max(0, Math.min(100, odds));
  }

  /**
   * Add entry to battle log
   */
  private addLog(type: 'action' | 'event' | 'combat' | 'status', message: string): void {
    const entry: LogEntry = {
      turn: this.state.turn,
      phase: this.state.phase,
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
    };
    this.state.log.push(entry);
  }

  /**
   * Get current state
   */
  getState(): GameState {
    return { ...this.state };
  }

  /**
   * Get configuration
   */
  getConfig(): BattleConfig {
    return this.config;
  }
}
