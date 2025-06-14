#!/usr/bin/env tsx

import { readFile } from 'fs/promises'
import { join } from 'path'
import { supabase } from '../src/services/supabase'

interface ProjectKnowledge {
  project_name: string;
  version: string;
  component_structure: any;
  file_structure: any;
  architecture_notes: any;
  features_implemented: any;
  combat_system_details: any;
  ui_implementation: any;
  dependencies: any;
  build_config: any;
  deployment_info: any;
  change_description: string;
}

async function updateKnowledgeBase() {
  try {
    console.log('📝 Updating Supabase knowledge base with latest project structure...')
    
    // First, run the migration to create the table if it doesn't exist
    await runKnowledgeBaseMigration()
    
    // Prepare the knowledge base data
    const knowledgeData: ProjectKnowledge = {
      project_name: 'AOTV',
      version: '1.0.0',
      
      component_structure: {
        layout: {
          path: '/src/components/Layout.ts',
          description: 'Main game layout with combat UI integration',
          methods: [
            'renderCombatArena()',
            'renderCombatHeader()',
            'renderCombatField()',
            'renderCombatActions()',
            'renderCombatLog()',
            'renderCombatResult()',
            'renderPlayerCombatant()',
            'renderEnemyCombatant()',
            'handleCombatAttack()',
            'handleCombatBlock()',
            'handleCombatMove()',
            'handleCombatEscape()'
          ]
        },
        combat_manager: {
          path: '/src/services/CombatManager.ts',
          description: 'Complete combat state machine implementation',
          features: [
            'Turn-based combat system',
            'State machine architecture',
            'Player and enemy actions',
            'Range management',
            'Damage calculation',
            'Loot generation',
            'Effect processing',
            'Victory/defeat conditions'
          ]
        },
        stores: {
          game_store: '/src/stores/GameStore.ts',
          ui_store: '/src/stores/UIStore.ts',
          description: 'MobX state management with combat integration'
        }
      },
      
      file_structure: {
        src: {
          components: ['Layout.ts', 'InventoryGrid.ts', 'CharacterEquipment.ts'],
          services: ['CombatManager.ts', 'AssetService.ts', 'Logger.ts', 'EffectProcessor.ts', 'ItemFactory.ts', 'Entity.ts'],
          stores: ['GameStore.ts', 'UIStore.ts'],
          types: ['combat.ts', 'entities.ts', 'items.ts', 'enums.ts', 'base.ts'],
          assets: ['data directory with game configuration']
        },
        database: {
          migrations: ['003_create_asset_tables.sql', '004_create_project_knowledge.sql'],
          schema: 'supabase-schema.sql'
        },
        scripts: ['update-knowledge-base.ts', 'run-migration.ts', 'upload-assets.ts']
      },
      
      architecture_notes: {
        combat_system: {
          state_machine: 'Uses CombatState enum with proper transitions',
          turn_flow: 'Player action select -> resolve -> enemy turn -> effects -> victory check',
          integration: 'CombatManager integrated with Layout.ts for UI rendering',
          observability: 'MobX observables trigger automatic UI updates'
        },
        ui_architecture: {
          rendering: 'Layout.ts handles all UI rendering with autorun for reactivity',
          styling: 'CSS variables for theming, combat-specific animations',
          event_handling: 'Event delegation with data-action attributes',
          responsive: 'Mobile-friendly with collapsible panels'
        },
        data_persistence: {
          supabase: 'Game data, player state, and combat sessions',
          local_state: 'MobX stores for reactive UI state',
          assets: 'Supabase asset management system'
        }
      },
      
      features_implemented: {
        combat_ui: {
          status: 'Complete',
          components: [
            'Combat arena with participant display',
            'Health/mana bars with real-time updates',
            'Action buttons for attack/block/move/escape',
            'Combat log with turn-based messages',
            'Combat result overlay with loot display',
            'Enemy targeting system',
            'Range indicator display'
          ]
        },
        combat_mechanics: {
          status: 'Complete',
          features: [
            'Turn-based state machine',
            'Damage calculation with armor reduction',
            'Critical hit system',
            'Block action with armor doubling',
            'Range management for bow/melee',
            'Effect processing system',
            'Loot generation with tier scaling',
            'Key modifier application'
          ]
        },
        inventory_system: {
          status: 'Complete',
          features: ['Drag and drop', 'Item filtering', 'Equipment slots', 'Stash management']
        },
        asset_management: {
          status: 'Complete',
          features: ['Supabase asset storage', 'Dynamic asset loading', 'Search and categorization']
        }
      },
      
      combat_system_details: {
        state_flow: {
          initialization: 'INITIALIZING -> ROLL_INITIATIVE',
          player_turn: 'PLAYER_TURN_START -> PLAYER_ACTION_SELECT -> PLAYER_ACTION_RESOLVE',
          enemy_turn: 'ENEMY_TURN_START -> ENEMY_INTENT -> ENEMY_ACTION_RESOLVE',
          turn_management: 'BETWEEN_TURNS -> CHECK_VICTORY -> CHECK_DEFEAT',
          completion: 'COMBAT_END -> LOOT_DISTRIBUTION'
        },
        actions: {
          attack: 'Basic damage dealing with hit/crit calculation',
          block: 'Doubles armor, reduces damage by 25%',
          move: 'Changes range state for bow/melee positioning',
          escape: 'Chance-based combat exit',
          abilities: 'Toggle-based special abilities (framework ready)'
        },
        ui_integration: {
          rendering: 'Layout.ts renderCombatArena() method',
          event_handling: 'handleCombatAttack/Block/Move/Escape methods',
          state_updates: 'MobX autorun triggers re-render on state changes',
          animations: 'CSS animations for combat feedback'
        },
        mock_system: {
          purpose: 'Testing combat UI without full game integration',
          location: 'Layout.ts createMockCombat() method',
          features: 'Simplified combat state for UI validation'
        }
      },
      
      ui_implementation: {
        layout_system: {
          main_file: '/src/components/Layout.ts',
          render_method: 'render() with state parameter destructuring',
          panel_structure: 'left (character), center (main content), right (inventory)',
          responsive: 'Mobile controls with panel toggling'
        },
        combat_interface: {
          arena_display: 'Player vs enemy cards with health bars',
          action_controls: 'Primary actions (attack/block/move) + utility (escape)',
          combat_log: 'Scrollable turn-based message display',
          result_overlay: 'Victory/defeat screen with loot and progression'
        },
        styling: {
          css_file: '/src/style.css',
          theme: 'Grimdark RPG with CSS variables',
          combat_colors: 'Health red, mana blue, enemy purple accents',
          animations: 'Combat feedback with arena effects and participant highlights'
        },
        event_system: {
          delegation: 'Single event listener with data-action routing',
          combat_actions: 'Direct CombatManager method calls',
          state_updates: 'MobX observables for automatic re-rendering'
        }
      },
      
      dependencies: {
        runtime: {
          vite: 'Build tool and dev server',
          typescript: 'Type safety and development',
          mobx: 'State management and reactivity',
          supabase: 'Backend services and database'
        },
        development: {
          vitest: 'Testing framework',
          eslint: 'Code quality',
          typescript: 'Type checking'
        }
      },
      
      build_config: {
        vite_config: '/vite.config.ts',
        typescript_config: '/tsconfig.json',
        dev_server: 'Port 3003 with host configuration',
        build_output: '/dist directory'
      },
      
      deployment_info: {
        environment: 'Development with local Vite server',
        database: 'Supabase cloud instance',
        assets: 'Supabase storage integration',
        docker: 'Docker configuration available',
        ports: '3003 for development server'
      },
      
      change_description: 'Complete combat UI reimplementation with state machine integration, comprehensive action handling, real-time health bars, combat log, result overlay, and responsive design. Added full CombatManager integration with Layout.ts rendering methods and event handlers. Enhanced CSS with combat-specific animations and styling.'
    }
    
    // Upsert the knowledge base record
    const { data, error } = await supabase
      .from('project_knowledge')
      .upsert(knowledgeData)
      .select()
    
    if (error) {
      console.error('❌ Failed to update knowledge base:', error)
      throw error
    }
    
    console.log('✅ Knowledge base updated successfully!')
    console.log('📊 Updated project structure for:', data?.[0]?.project_name)
    console.log('🔄 Last updated:', data?.[0]?.last_updated)
    
  } catch (error) {
    console.error('❌ Knowledge base update failed:', error)
    process.exit(1)
  }
}

async function runKnowledgeBaseMigration() {
  try {
    console.log('🔧 Running knowledge base migration...')
    
    const migrationPath = join(process.cwd(), 'database', 'migrations', '004_create_project_knowledge.sql')
    const sql = await readFile(migrationPath, 'utf-8')
    
    // Split SQL into individual statements and execute them
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    for (const statement of statements) {
      if (statement.length === 0) continue
      
      // Use raw SQL execution via Supabase
      const { error } = await supabase.rpc('exec', { sql: statement })
      
      if (error && !error.message?.includes('already exists')) {
        console.warn(`Migration statement warning (continuing):`, error.message)
      }
    }
    
    console.log('✅ Knowledge base migration completed!')
    
  } catch (error) {
    console.log('⚠️  Migration may need manual execution:', error)
    // Continue anyway, the table might already exist
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateKnowledgeBase()
}

export { updateKnowledgeBase }