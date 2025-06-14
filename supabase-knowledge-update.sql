-- AOTV Project Knowledge Base Update
-- Run this SQL in your Supabase dashboard to update the project knowledge base
-- with the latest combat UI implementation details

-- First, create the project_knowledge table if it doesn't exist
CREATE TABLE IF NOT EXISTS project_knowledge (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Project information
  project_name VARCHAR(100) NOT NULL DEFAULT 'AOTV',
  version VARCHAR(20) DEFAULT '1.0.0',
  
  -- Structure information
  component_structure JSONB DEFAULT '{}',
  file_structure JSONB DEFAULT '{}',
  architecture_notes JSONB DEFAULT '{}',
  
  -- Implementation details
  features_implemented JSONB DEFAULT '{}',
  combat_system_details JSONB DEFAULT '{}',
  ui_implementation JSONB DEFAULT '{}',
  
  -- Technical documentation
  dependencies JSONB DEFAULT '{}',
  build_config JSONB DEFAULT '{}',
  deployment_info JSONB DEFAULT '{}',
  
  -- Metadata
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by VARCHAR(100) DEFAULT 'Claude Code',
  change_description TEXT,
  
  -- Ensure single project record
  UNIQUE(project_name)
);

-- Enable Row Level Security
ALTER TABLE project_knowledge ENABLE ROW LEVEL SECURITY;

-- Allow public read access for project knowledge
CREATE POLICY IF NOT EXISTS "Public read access to project knowledge" ON project_knowledge
  FOR SELECT USING (true);

-- Allow authenticated users to update project knowledge
CREATE POLICY IF NOT EXISTS "Authenticated users can update project knowledge" ON project_knowledge
  FOR ALL USING (auth.role() = 'authenticated');

-- Create trigger for automatic timestamp updates if the function exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_project_knowledge_updated_at ON project_knowledge;
    CREATE TRIGGER update_project_knowledge_updated_at 
      BEFORE UPDATE ON project_knowledge 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_project_knowledge_project_name ON project_knowledge(project_name);
CREATE INDEX IF NOT EXISTS idx_project_knowledge_last_updated ON project_knowledge(last_updated);

-- Insert/Update the comprehensive project knowledge
INSERT INTO project_knowledge (
  project_name,
  version,
  component_structure,
  file_structure,
  architecture_notes,
  features_implemented,
  combat_system_details,
  ui_implementation,
  dependencies,
  build_config,
  deployment_info,
  change_description,
  updated_by
) VALUES (
  'AOTV',
  '1.0.0',
  
  -- Component Structure
  '{
    "layout": {
      "path": "/src/components/Layout.ts",
      "description": "Main game layout with complete combat UI integration",
      "key_methods": [
        "renderCombatArena() - Main combat interface renderer",
        "renderCombatHeader() - Turn counter and status display",
        "renderCombatField() - Player vs enemy combat field",
        "renderCombatActions() - Action buttons (attack/block/move/escape)",
        "renderCombatLog() - Turn-based message display",
        "renderCombatResult() - Victory/defeat overlay with loot",
        "renderPlayerCombatant() - Player health/mana display",
        "renderEnemyCombatant() - Enemy health and effects display",
        "handleCombatAttack() - Attack action handler",
        "handleCombatBlock() - Block action handler", 
        "handleCombatMove() - Movement action handler",
        "handleCombatEscape() - Escape action handler",
        "handleEnemyTarget() - Enemy targeting system",
        "createMockCombat() - Mock combat for UI testing"
      ],
      "integration": "Full CombatManager integration with MobX autorun reactivity"
    },
    "combat_manager": {
      "path": "/src/services/CombatManager.ts", 
      "description": "Complete combat state machine implementation",
      "state_machine": [
        "INITIALIZING -> ROLL_INITIATIVE",
        "PLAYER_TURN_START -> PLAYER_ACTION_SELECT -> PLAYER_ACTION_RESOLVE",
        "ENEMY_TURN_START -> ENEMY_INTENT -> ENEMY_ACTION_RESOLVE",
        "BETWEEN_TURNS -> CHECK_VICTORY -> CHECK_DEFEAT",
        "COMBAT_END -> LOOT_DISTRIBUTION"
      ],
      "key_features": [
        "Turn-based combat with proper state transitions",
        "Player action validation and execution",
        "Enemy AI with intent system",
        "Range management for bow/melee weapons",
        "Damage calculation with armor/critical hits",
        "Effect processing system",
        "Loot generation with tier scaling",
        "Key modifier application",
        "Victory/defeat condition checking"
      ]
    },
    "stores": {
      "game_store": "/src/stores/GameStore.ts",
      "ui_store": "/src/stores/UIStore.ts",
      "description": "MobX state management with reactive combat integration",
      "combat_integration": "combatManager observable triggers automatic UI updates"
    },
    "services": {
      "effect_processor": "/src/services/EffectProcessor.ts",
      "item_factory": "/src/services/ItemFactory.ts", 
      "entity": "/src/services/Entity.ts",
      "description": "Supporting services for combat system functionality"
    }
  }',
  
  -- File Structure
  '{
    "src": {
      "components": [
        "Layout.ts - Main game layout with combat UI",
        "InventoryGrid.ts - Drag-drop inventory interface",
        "CharacterEquipment.ts - Equipment slot management"
      ],
      "services": [
        "CombatManager.ts - Combat state machine",
        "AssetService.ts - Asset management",
        "Logger.ts - Debug logging",
        "EffectProcessor.ts - Combat effects",
        "ItemFactory.ts - Item generation",
        "Entity.ts - Player/enemy entities",
        "supabase.ts - Database integration"
      ],
      "stores": [
        "GameStore.ts - Game state management",
        "UIStore.ts - UI state management"
      ],
      "types": [
        "combat.ts - Combat system types",
        "entities.ts - Player/enemy types", 
        "items.ts - Item and equipment types",
        "enums.ts - Game enumerations",
        "base.ts - Base type definitions"
      ],
      "assets": {
        "data": "Game configuration and item templates"
      }
    },
    "database": {
      "migrations": [
        "003_create_asset_tables.sql",
        "004_create_project_knowledge.sql"
      ],
      "schema": "supabase-schema.sql - Complete database schema"
    },
    "scripts": [
      "update-knowledge-base.ts - Project documentation updater",
      "run-migration.ts - Database migration runner",
      "upload-assets.ts - Asset upload automation"
    ],
    "styling": {
      "main": "/src/style.css - Complete game styling with combat animations"
    }
  }',
  
  -- Architecture Notes
  '{
    "combat_system": {
      "state_machine": "Uses CombatState enum with validated transitions, prevents invalid state changes",
      "turn_flow": "Player action select -> resolve -> enemy turn -> effects processing -> victory/defeat check -> next turn",
      "ui_integration": "CombatManager fully integrated with Layout.ts rendering methods",
      "reactivity": "MobX observables trigger automatic UI updates on state changes",
      "mock_testing": "Mock combat system for UI validation without full game integration"
    },
    "ui_architecture": {
      "rendering": "Layout.ts handles all UI rendering with autorun for MobX reactivity",
      "styling": "CSS variables for theming, combat-specific animations and effects",
      "event_handling": "Event delegation with data-action attributes for clean separation",
      "responsive": "Mobile-friendly design with collapsible panels and touch controls",
      "combat_interface": "Dedicated combat arena with real-time health bars, action controls, and combat log"
    },
    "data_persistence": {
      "supabase": "Game data, player state, combat sessions, and asset management",
      "local_state": "MobX stores for reactive UI state and temporary combat data",
      "assets": "Comprehensive Supabase asset management with search and categorization"
    },
    "testing": {
      "vitest": "Unit testing framework for services and components",
      "mock_combat": "UI testing with simplified combat scenarios",
      "end_to_end": "Planned comprehensive game flow testing"
    }
  }',
  
  -- Features Implemented
  '{
    "combat_ui": {
      "status": "Complete and Functional",
      "components": [
        "Combat arena with participant display cards",
        "Real-time health and mana bars with percentage calculation",
        "Action button interface (attack/block/move/escape)",
        "Scrollable combat log with turn-based messages and color coding",
        "Combat result overlay with victory/defeat states and loot display",
        "Enemy targeting system with visual feedback",
        "Range indicator and status display",
        "Combat state indicator showing current phase",
        "Effect badge display for active buffs/debuffs"
      ],
      "animations": "CSS animations for combat feedback and state transitions",
      "responsiveness": "Mobile-optimized interface with touch controls"
    },
    "combat_mechanics": {
      "status": "Complete Core Implementation",
      "state_machine": "Full state machine with 11 distinct combat states",
      "actions": [
        "Attack - Basic damage with hit/critical calculation",
        "Block - Doubles armor, reduces damage by 25%",
        "Move - Range state changes for tactical positioning",
        "Escape - Chance-based combat exit with failure handling"
      ],
      "calculations": [
        "Damage calculation with armor reduction",
        "Critical hit system with configurable chance",
        "Hit chance calculation with accuracy stats",
        "Range-based attack availability"
      ],
      "systems": [
        "Effect processing with turn-based duration",
        "Loot generation with tier-based scaling",
        "Key modifier application for dungeon difficulty",
        "Experience and gold reward calculation"
      ]
    },
    "inventory_system": {
      "status": "Complete",
      "features": [
        "Drag and drop item management",
        "Item filtering by type and category", 
        "Equipment slot management",
        "Stash tab organization",
        "Item tooltips and information display"
      ]
    },
    "asset_management": {
      "status": "Complete",
      "features": [
        "Supabase asset storage integration",
        "Dynamic asset loading and caching",
        "Search and categorization system",
        "Asset manifest generation"
      ]
    }
  }',
  
  -- Combat System Details
  '{
    "state_flow": {
      "initialization": {
        "states": "INITIALIZING -> ROLL_INITIATIVE",
        "actions": "Apply key modifiers, set up participants, initialize range states"
      },
      "player_turn": {
        "states": "PLAYER_TURN_START -> PLAYER_ACTION_SELECT -> PLAYER_ACTION_RESOLVE",
        "actions": "Process turn start effects, wait for input, execute chosen action"
      },
      "enemy_turn": {
        "states": "ENEMY_TURN_START -> ENEMY_INTENT -> ENEMY_ACTION_RESOLVE", 
        "actions": "Generate enemy intents, display to player, execute enemy actions"
      },
      "turn_management": {
        "states": "BETWEEN_TURNS -> CHECK_VICTORY -> CHECK_DEFEAT",
        "actions": "Process effects, check win/lose conditions, advance turn counter"
      },
      "completion": {
        "states": "COMBAT_END -> LOOT_DISTRIBUTION",
        "actions": "Apply defeat penalties or distribute victory rewards"
      }
    },
    "action_system": {
      "attack": {
        "description": "Basic damage dealing with hit/critical calculation",
        "mechanics": "Hit chance check, critical hit roll, armor reduction, damage application"
      },
      "block": {
        "description": "Defensive action that doubles armor and reduces damage",
        "mechanics": "Temporary armor doubling, 25% damage reduction effect"
      },
      "move": {
        "description": "Changes range state for tactical positioning",
        "mechanics": "Range state transition, affects attack availability"
      },
      "escape": {
        "description": "Attempt to flee from combat with success chance",
        "mechanics": "Chance-based success, sets escape flag, ends combat on success"
      },
      "abilities": {
        "description": "Toggle-based special abilities (framework ready)",
        "mechanics": "Ability state management, effect application system prepared"
      }
    },
    "ui_integration": {
      "rendering": {
        "method": "Layout.ts renderCombatArena()",
        "components": "Header, field, actions, log, result overlay",
        "reactivity": "MobX autorun triggers re-render on observable changes"
      },
      "event_handling": {
        "attack": "handleCombatAttack() - validates state and executes action",
        "block": "handleCombatBlock() - applies defensive effects",
        "move": "handleCombatMove() - changes range state",
        "escape": "handleCombatEscape() - attempts combat exit",
        "targeting": "handleEnemyTarget() - enemy selection system"
      },
      "state_display": {
        "health_bars": "Real-time percentage calculation with color coding",
        "combat_log": "Turn-based message display with type-based styling",
        "action_availability": "Dynamic button state based on combat conditions"
      }
    },
    "mock_system": {
      "purpose": "Testing combat UI without full game integration",
      "location": "Layout.ts createMockCombat() method",
      "features": [
        "Simplified combat state for UI validation",
        "Mock player and enemy data",
        "Basic combat log simulation",
        "Result state testing"
      ],
      "usage": "Activated via Test Combat button in town hub"
    }
  }',
  
  -- UI Implementation
  '{
    "layout_system": {
      "main_file": "/src/components/Layout.ts",
      "render_method": "render() with destructured state parameter for optimal reactivity",
      "panel_structure": {
        "left": "Character info, stats, equipment link",
        "center": "Main content area with screen-specific rendering",
        "right": "Inventory with filtering and drag-drop support"
      },
      "responsive": "Mobile controls with panel toggling and touch optimization"
    },
    "combat_interface": {
      "arena_display": {
        "layout": "Side-by-side player vs enemy cards",
        "health_bars": "Real-time percentage-based bars with numeric display",
        "effects": "Badge display for active buffs/debuffs",
        "targeting": "Click-to-target enemy selection with visual feedback"
      },
      "action_controls": {
        "primary": "Attack, Block, Move buttons with state-based availability",
        "utility": "Escape button with success chance indication",
        "future": "Ability slots prepared for special actions"
      },
      "combat_log": {
        "display": "Scrollable message area with turn numbering",
        "formatting": "Color-coded messages by type (system, action, damage)",
        "history": "Last 10 messages shown, full log stored in combat state"
      },
      "result_overlay": {
        "victory": "Experience, gold, and loot display",
        "defeat": "Penalty information and retry options",
        "escape": "Escape confirmation and return to town"
      }
    },
    "styling": {
      "css_file": "/src/style.css",
      "theme": "Grimdark RPG aesthetic with CSS custom properties",
      "colors": {
        "health": "#dc2626 (red)",
        "mana": "#2563eb (blue)",
        "enemy_health": "#dc2626 (red)",
        "enemy_mana": "#7c3aed (purple)",
        "combat_bg": "#1f1f1f (dark)",
        "action_buttons": "#374151 with #4b5563 hover"
      },
      "animations": {
        "arena_effects": "Success flash, player/enemy highlights, action feedback",
        "participant_animations": "Turn activation, glow effects, damage feedback",
        "button_animations": "Availability pulse, hover effects, click feedback",
        "state_transitions": "Combat state change animations"
      }
    },
    "event_system": {
      "delegation": "Single event listener with data-action attribute routing",
      "combat_actions": "Direct CombatManager method calls with error handling",
      "state_updates": "MobX observables ensure automatic re-rendering",
      "error_handling": "Try-catch blocks with console logging for debugging"
    }
  }',
  
  -- Dependencies
  '{
    "runtime": {
      "vite": "Build tool and development server with HMR",
      "typescript": "Type safety and enhanced development experience",
      "mobx": "Reactive state management for UI updates",
      "supabase": "Backend services, database, and asset storage"
    },
    "development": {
      "vitest": "Testing framework for unit and integration tests",
      "eslint": "Code quality and consistency enforcement",
      "tsx": "TypeScript execution for scripts and development tools"
    },
    "build": {
      "vite_pwa": "Progressive Web App capabilities",
      "asset_processing": "Enhanced asset manifest generation"
    }
  }',
  
  -- Build Configuration
  '{
    "vite_config": "/vite.config.ts - Development server and build configuration",
    "typescript_config": "/tsconfig.json - TypeScript compiler settings",
    "dev_server": {
      "port": 3003,
      "host": "0.0.0.0 for external access",
      "hmr": "Hot module replacement enabled"
    },
    "build_output": "/dist directory with optimized assets",
    "pwa": "Service worker and manifest generation"
  }',
  
  -- Deployment Information
  '{
    "environment": "Development with local Vite server",
    "database": {
      "provider": "Supabase cloud instance",
      "url": "Configured via VITE_SUPABASE_URL environment variable",
      "authentication": "Supabase auth with RLS policies"
    },
    "assets": {
      "storage": "Supabase storage buckets for game assets",
      "processing": "Automated asset manifest generation",
      "optimization": "Asset categorization and search capabilities"
    },
    "containerization": {
      "docker": "Docker configuration available for deployment",
      "ports": "3003 for development server, configurable for production"
    },
    "performance": {
      "bundle_splitting": "Vendor and application code separation",
      "asset_optimization": "Image compression and format optimization",
      "caching": "Service worker for offline capabilities"
    }
  }',
  
  -- Change Description
  'Complete combat UI reimplementation with comprehensive state machine integration. 

  Key Changes:
  1. Full CombatManager integration with Layout.ts rendering methods
  2. Real-time health/mana bars with percentage calculations
  3. Complete action handling system (attack/block/move/escape)
  4. Combat log with turn-based messaging and color coding
  5. Combat result overlay with victory/defeat states and loot display
  6. Enemy targeting system with visual feedback
  7. Enhanced CSS with combat-specific animations and effects
  8. Mock combat system for UI testing and validation
  9. Responsive design optimized for both desktop and mobile
  10. MobX reactive integration for automatic UI updates

  Technical Implementation:
  - State machine with 11 distinct combat states and validated transitions
  - Event delegation with data-action attribute routing
  - Comprehensive error handling and debugging support
  - CSS custom properties for consistent theming
  - Animation system for combat feedback and state transitions
  - Mobile-optimized interface with touch controls

  The combat system is now fully functional with a complete UI that provides real-time feedback, handles all player actions, displays enemy information, and manages the full combat flow from initialization to loot distribution.',
  
  'Claude Code'
) 
ON CONFLICT (project_name) 
DO UPDATE SET
  version = EXCLUDED.version,
  component_structure = EXCLUDED.component_structure,
  file_structure = EXCLUDED.file_structure,
  architecture_notes = EXCLUDED.architecture_notes,
  features_implemented = EXCLUDED.features_implemented,
  combat_system_details = EXCLUDED.combat_system_details,
  ui_implementation = EXCLUDED.ui_implementation,
  dependencies = EXCLUDED.dependencies,
  build_config = EXCLUDED.build_config,
  deployment_info = EXCLUDED.deployment_info,
  change_description = EXCLUDED.change_description,
  updated_by = EXCLUDED.updated_by,
  last_updated = timezone('utc'::text, now());

-- Verify the update
SELECT 
  project_name,
  version,
  last_updated,
  updated_by,
  length(change_description) as description_length
FROM project_knowledge 
WHERE project_name = 'AOTV';