-- Loot & Craft Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM public;

-- Players table
CREATE TABLE players (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  level INTEGER DEFAULT 1,
  experience BIGINT DEFAULT 0,
  gold INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Player stats
  base_health INTEGER DEFAULT 100,
  base_mana INTEGER DEFAULT 50,
  base_energy_shield INTEGER DEFAULT 0,
  base_armor INTEGER DEFAULT 0,
  base_damage INTEGER DEFAULT 10,
  
  -- Current values (for save/restore)
  current_health INTEGER DEFAULT 100,
  current_mana INTEGER DEFAULT 50,
  current_energy_shield INTEGER DEFAULT 0,
  
  UNIQUE(user_id)
);

-- Items table
CREATE TABLE items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  
  -- Core item properties
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'weapon', 'armor', 'crafting', 'key'
  slot VARCHAR(20), -- 'weapon', 'helmet', 'chest', etc. (null for crafting/keys)
  rarity VARCHAR(20) DEFAULT 'normal', -- 'normal', 'magic', 'rare', 'legendary', 'set'
  tier INTEGER DEFAULT 1,
  
  -- Base stats (JSON for flexibility)
  base_stats JSONB DEFAULT '{}',
  
  -- Item location
  location VARCHAR(20) DEFAULT 'inventory', -- 'inventory', 'equipped', 'stash'
  stash_tab INTEGER DEFAULT 0, -- which stash tab (0 = main inventory)
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  
  -- Metadata
  image_path VARCHAR(200),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Equipped loadout (1, 2, or 3, null if not equipped)
  equipped_loadout INTEGER CHECK (equipped_loadout IN (1, 2, 3))
);

-- Item affixes table (for magic/rare items)
CREATE TABLE item_affixes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  
  -- Affix properties
  type VARCHAR(10) NOT NULL, -- 'prefix' or 'suffix'
  name VARCHAR(50) NOT NULL,
  tier INTEGER DEFAULT 1,
  effect_type VARCHAR(30) NOT NULL, -- 'stat_modifier', 'ability_grant', etc.
  effect_data JSONB NOT NULL, -- flexible storage for effect parameters
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Game sessions/saves
CREATE TABLE game_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  
  -- Current game state
  current_activity VARCHAR(20) DEFAULT 'town', -- 'town', 'combat', 'dungeon', 'craft'
  
  -- Combat state (if in combat)
  combat_data JSONB, -- enemies, turn order, effects, etc.
  
  -- Dungeon progress (if in dungeon)
  dungeon_data JSONB, -- current floor, key consumed, etc.
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Only one active session per player
  UNIQUE(player_id)
);

-- Game statistics/analytics
CREATE TABLE player_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  
  -- Combat stats
  total_kills INTEGER DEFAULT 0,
  total_deaths INTEGER DEFAULT 0,
  dungeons_completed INTEGER DEFAULT 0,
  
  -- Crafting stats
  items_crafted INTEGER DEFAULT 0,
  items_disenchanted INTEGER DEFAULT 0,
  
  -- Economy stats
  total_gold_earned BIGINT DEFAULT 0,
  total_gold_spent BIGINT DEFAULT 0,
  
  -- Time tracking
  total_playtime_seconds BIGINT DEFAULT 0,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security Policies
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_affixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- Players can only access their own data
CREATE POLICY "Users can view own player data" ON players
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own player data" ON players
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own player data" ON players
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Items policies (via player_id foreign key)
CREATE POLICY "Users can view own items" ON items
  FOR SELECT USING (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own items" ON items
  FOR ALL USING (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

-- Item affixes inherit permissions from items
CREATE POLICY "Users can view own item affixes" ON item_affixes
  FOR SELECT USING (
    item_id IN (
      SELECT i.id FROM items i 
      JOIN players p ON i.player_id = p.id 
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own item affixes" ON item_affixes
  FOR ALL USING (
    item_id IN (
      SELECT i.id FROM items i 
      JOIN players p ON i.player_id = p.id 
      WHERE p.user_id = auth.uid()
    )
  );

-- Game sessions policies
CREATE POLICY "Users can view own game sessions" ON game_sessions
  FOR SELECT USING (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own game sessions" ON game_sessions
  FOR ALL USING (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

-- Player stats policies
CREATE POLICY "Users can view own player stats" ON player_stats
  FOR SELECT USING (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own player stats" ON player_stats
  FOR ALL USING (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the timestamp trigger to relevant tables
CREATE TRIGGER update_players_updated_at 
  BEFORE UPDATE ON players 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_sessions_updated_at 
  BEFORE UPDATE ON game_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_stats_updated_at 
  BEFORE UPDATE ON player_stats 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_players_user_id ON players(user_id);
CREATE INDEX idx_items_player_id ON items(player_id);
CREATE INDEX idx_items_location ON items(location);
CREATE INDEX idx_items_type ON items(type);
CREATE INDEX idx_item_affixes_item_id ON item_affixes(item_id);
CREATE INDEX idx_game_sessions_player_id ON game_sessions(player_id);
CREATE INDEX idx_player_stats_player_id ON player_stats(player_id);