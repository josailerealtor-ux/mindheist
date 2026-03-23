# MindHeist – Mobile Puzzle Game

## Stack
- React Native (Expo) for cross-platform mobile
- Supabase for backend/auth/realtime
- Node.js + Express for API layer

## Commands
- Start: `npx expo start`
- Test: `jest --watchAll`
- Lint: `eslint . --fix`

## Architecture Rules
- All puzzle logic lives in /src/engine/
- Never put game state in UI components — use Zustand store
- IMPORTANT: Always write a Jest test for new puzzle mechanics
