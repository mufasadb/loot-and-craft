# AOTV Project Knowledge Base Setup

This document explains how to set up and use the Supabase knowledge base for the AOTV project, which contains comprehensive documentation about the project structure and recent combat UI implementation.

## Setup Instructions

### 1. Create the Knowledge Base Table

Run the SQL script in your Supabase dashboard:

```bash
# The complete SQL script is available in:
./supabase-knowledge-update.sql
```

This script will:
- Create the `project_knowledge` table if it doesn't exist
- Set up proper Row Level Security policies
- Insert/update comprehensive project documentation
- Create indexes for efficient queries

### 2. Manual SQL Execution

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-knowledge-update.sql`
4. Run the script

### 3. Verify the Setup

After running the script, you can verify the knowledge base was created correctly:

```sql
SELECT 
  project_name,
  version,
  last_updated,
  updated_by,
  length(change_description) as description_length
FROM project_knowledge 
WHERE project_name = 'AOTV';
```

## Knowledge Base Contents

The knowledge base contains comprehensive documentation about:

### 1. Component Structure
- **Layout.ts**: Main game layout with complete combat UI integration
- **CombatManager.ts**: Combat state machine implementation
- **Stores**: MobX state management with reactive combat integration

### 2. Combat System Implementation
- **State Machine**: 11 distinct combat states with validated transitions
- **UI Integration**: Full CombatManager integration with Layout.ts rendering
- **Action System**: Attack, block, move, and escape actions with proper handling
- **Real-time Updates**: MobX observables trigger automatic UI re-rendering

### 3. Recent Changes (Combat UI Reimplementation)
- Complete combat arena interface with participant display
- Real-time health/mana bars with percentage calculations
- Action button interface with state-based availability
- Combat log with turn-based messaging and color coding
- Combat result overlay with victory/defeat states and loot display
- Enemy targeting system with visual feedback
- Enhanced CSS with combat-specific animations

### 4. Technical Architecture
- **Reactivity**: MobX autorun for automatic UI updates
- **Event Handling**: Event delegation with data-action attributes
- **Responsive Design**: Mobile-optimized interface with touch controls
- **State Management**: Proper separation of game logic and UI state

## Using the Knowledge Base

### TypeScript Integration

The knowledge base is integrated into the Supabase service:

```typescript
import { GameDataService } from './src/services/supabase'

// Get project knowledge
const knowledge = await GameDataService.getProjectKnowledge('AOTV')

// Update project knowledge
await GameDataService.updateProjectKnowledge('AOTV', {
  version: '1.1.0',
  change_description: 'Added new feature...'
})
```

### Available Methods

- `getProjectKnowledge(projectName)`: Retrieve project documentation
- `updateProjectKnowledge(projectName, updates)`: Update project information

### Data Structure

The knowledge base stores:
- Component structure and file locations
- Architecture notes and implementation details
- Feature implementation status
- Combat system details
- UI implementation specifics
- Dependencies and build configuration
- Deployment information

## Updating the Knowledge Base

To update the knowledge base with new changes:

1. Modify the `supabase-knowledge-update.sql` file
2. Update the relevant sections (component_structure, features_implemented, etc.)
3. Run the SQL in your Supabase dashboard
4. Verify the changes were applied

## MCP/Claude Integration

This knowledge base is designed to work with MCP (Model Context Protocol) servers and Claude Code to provide:

- Comprehensive project context for development assistance
- Up-to-date documentation of implemented features
- Technical details for debugging and enhancement
- Architecture information for maintaining consistency

## Files Created/Modified

1. **`/database/migrations/004_create_project_knowledge.sql`** - Migration for knowledge base table
2. **`/scripts/update-knowledge-base.ts`** - TypeScript script for updating knowledge base
3. **`/supabase-knowledge-update.sql`** - Complete SQL script for manual execution
4. **`/src/services/supabase.ts`** - Added knowledge base methods to GameDataService
5. **`/KNOWLEDGE_BASE_SETUP.md`** - This documentation file

## Next Steps

1. Run the SQL script in your Supabase dashboard
2. Verify the knowledge base is accessible
3. Use the knowledge base for development context and documentation
4. Update the knowledge base as new features are implemented

The knowledge base now contains comprehensive documentation of the complete combat UI reimplementation and can serve as a reference for future development and MCP integration.