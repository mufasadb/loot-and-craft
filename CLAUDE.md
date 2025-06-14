# Claude Code Guidelines for AOTV

## Project Description
AOTV is an RPG game project built with TypeScript, Vite, and Supabase integration. The game features classic RPG mechanics including combat, crafting, dungeons, and character progression.

## Game Development Guidelines
This project has a Game Design Document (GDD). When considering making game decisions, reference the GDD. If unsure, ask the user rather than guess.

This project manages a current to-do, but there is more detail in the project plan which is more explicit, use this to drive the given task you're working on.

## Asset Management
Prioritize using assets from the existing manifest collection whenever visual elements are needed. The manifest contains organized categories including Fantasy Icons, Classic RPG GUI elements, and game-specific assets.

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

## Game Development Standards
- **Game Balance**: When implementing game mechanics (combat, crafting, progression), consider balance implications and reference existing game data in `assets/data/`
- **UI Consistency**: Follow the Classic RPG GUI patterns established in the asset collection for consistent visual design
- **State Management**: Use the established GameStore and UIStore patterns for game state. Keep game logic separate from UI logic
- **Data Structure**: Follow the type definitions in `src/types/` for entities, items, combat, and other game systems
- **Performance**: Consider performance implications for real-time game features like combat calculations and rendering
- **Save System**: Supabase infrastructure is configured with database schema for players, items, and game sessions. The `GameDataService` class provides methods for data persistence, but the main game currently runs in local mode. When implementing save functionality, use the existing service layer to persist character progression, inventory, and world state.