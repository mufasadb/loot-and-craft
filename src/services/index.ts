// Core game logic exports - Phase 3 implementation

// Entity system
export { BaseEntity, Player, Enemy } from './Entity';

// Item generation
export { ItemFactory } from './ItemFactory';

// Effect system
export { 
  BaseCombatEffect,
  IgniteEffectImpl,
  ChillEffectImpl,
  FreezeEffectImpl,
  BlockEffectImpl,
  OnHitEffectImpl,
  LifeStealEffectImpl,
  EffectProcessor,
  EffectFactory
} from './EffectProcessor';

// Combat system
export { CombatManager } from './CombatManager';

// Asset management (from previous phases)
export { assetManager } from './AssetManager';
export { assetSearch } from './AssetSearch';

// Supabase integration
export { supabase, GameDataService } from './supabase';

// Asset service for Supabase integration
export { AssetService } from './AssetService';