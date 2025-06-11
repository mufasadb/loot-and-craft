# Claude Code Guidelines for AOTV

## Project Description
AOTV is an RPG game project built with TypeScript, Vite, and Supabase integration. The game features classic RPG mechanics including combat, crafting, dungeons, and character progression.

## Game Development Guidelines
This project has a Game Design Document (GDD). When considering making game decisions, reference the GDD. If unsure, ask the user rather than guess.

This project manages a current to-do, but there is more detail in the project plan which is more explicit, use this to drive the given task you're working on.

## Asset Management
Prioritize using assets from the existing manifest collection whenever visual elements are needed. The manifest contains organized categories including Fantasy Icons, Classic RPG GUI elements, and game-specific assets.

## Supabase Integration
Use the Supabase instance for project structure persistence. Update it after each change and use it when trying to find information about where code lives.

## Partnership Approach
Claude Code should act as a thoughtful development partner, not just executing instructions blindly. Always:
- Critically evaluate each task for context and potential unintended impacts
- Ask clarifying questions when requirements are unclear or seem problematic
- Consider how changes fit within the broader application architecture
- Start every task by crafting a todo list to clarify intentions and next steps

## Test-Driven Development (TDD)
All development must follow TDD principles:
- Write tests before implementing features
- Maintain a main line of end-to-end tests for smoke testing and regression prevention
- Update e2e tests when relevant to new features
- No feature is considered complete until tests pass

## Implementation Standards
- Consider upcoming work during implementation but avoid leaving TODO comments in code
- Avoid mocking data unless explicitly instructed
- Write production-ready code, not placeholders
- Follow existing code patterns and conventions

## Technical Documentation
Maintain a `tech-notes.md` file that:
- Collects technical implementation details as the codebase grows
- Documents architectural decisions, patterns, and implementation specifics
- Serves as a reference for complex technical aspects
- Keeps technical details separate from CLAUDE.md
- Should be updated continuously as features are developed

## Task Management
Maintain a `current-todo.md` file that:
- Contains detailed documentation of current and upcoming actions
- Provides continuity in case of disconnection or context switches
- Helps maintain focus on the current task flow
- Should be updated in real-time as tasks progress
- Includes both immediate next steps and broader project goals

## Deployment
### Feature Completion
- Before pushing confirm that no api keys are going into the repo, update git ignore if need be
- Commit and push all completed features to GitHub
- Ensure Docker images are built and pushed to Docker Hub

### Documentation Requirements
README must include:
- Container paths and volume mappings
- Environment variables and configuration
- Unraid-specific deployment instructions
- Port mappings and networking requirements

## Game Development Standards
- **Game Balance**: When implementing game mechanics (combat, crafting, progression), consider balance implications and reference existing game data in `assets/data/`
- **UI Consistency**: Follow the Classic RPG GUI patterns established in the asset collection for consistent visual design
- **State Management**: Use the established GameStore and UIStore patterns for game state. Keep game logic separate from UI logic
- **Data Structure**: Follow the type definitions in `src/types/` for entities, items, combat, and other game systems
- **Performance**: Consider performance implications for real-time game features like combat calculations and rendering
- **Save System**: Leverage Supabase for persistent game data including character progression, inventory, and world state

## Commands
- Test command: npm run test (to be setup with testing framework)
- Lint command: npm run lint
- Build command: npm run build
- Dev command: npm run dev
- Typecheck command: npm run typecheck