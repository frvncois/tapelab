# Repository Guidelines

## Project Structure & Module Organization
Tapelab is an Expo-managed React Native app.
- `App.tsx` wires the navigation stack; `index.ts` boots Expo.
- `src/screens/` contains route components like `DashboardScreen.tsx` and `SessionScreen.tsx`.
- `src/components/` stores reusable UI blocks; `src/utils/` holds cross-cutting helpers.
- `src/store/` defines Zustand state and selectors; keep actions pure and serializable.
- `src/native/` exposes the temporary `TapelabAudio` mock—treat its method signatures as API contracts.
- Shared types live in `src/types/`, while images and icons live in `assets/`. Expo-managed native shells stay in `android/` and `ios/`.

## Build, Test, and Development Commands
- `npm install` — refresh dependencies after pulling or switching native branches.
- `npm run start` — start Metro and Expo dev tools; select the target platform from the prompt.
- `npm run android` / `npm run ios` — build and install to a connected emulator or device via Expo Run.
- `npm run web` — load the web preview to smoke-test layout and Zustand flows.

## Coding Style & Naming Conventions
Use TypeScript with `strict` mode and functional React components. Follow two-space indentation, trailing commas, and single quotes as in the checked-in files. Prefer PascalCase for components/screens, camelCase for hooks and selectors, and SCREAMING_SNAKE_CASE only for real constants. Keep style values consistent with the existing dark theme palette.

## Testing Guidelines
Automated tests are not configured yet. Record manual verification steps in every PR (platform, device, scenario). When adding Jest or `@testing-library/react-native`, colocate specs under `__tests__/`, expose them through `npm test`, and focus coverage on Zustand stores, navigation flows, and native-bridge edge cases.

## Commit & Pull Request Guidelines
History is minimal; use short, imperative commit subjects (≤72 chars) with optional scopes, e.g., `feat/store: add transport transitions`. Squash fixup commits before sharing. PRs should include a brief summary, screenshots or screen recordings for UI changes, manual test notes, and linked issues. Mention reviewers responsible for the affected module (`screens`, `store`, `native`) and keep the diff narrowly scoped.

## Native Integration Notes
`src/native/index.ts` mirrors the forthcoming native module. Preserve method names and shapes, gate new calls with runtime checks, and reuse the existing console log format so we can compare behavior once the true module lands.
