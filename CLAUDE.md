# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tapelab is a multi-track audio recording and playback app for iOS built with React Native (Expo Bare workflow) + TypeScript + Swift. It's a DAW-style application supporting 4 independent tracks with basic playback and recording capabilities.

**Current Implementation Status:**
- ✅ Basic multi-track playback with region scheduling
- ✅ Multi-track recording with live region visualization
- ✅ Session management (create, open, rename)
- ✅ Timeline with drag-to-seek playhead
- ✅ Transport controls (play, stop, record, rewind)
- ⚠️ Track effects (EQ, reverb, delay) - stubs only, not yet functional
- ⚠️ Reverse playback - not yet implemented
- ⚠️ Waveform visualization - component exists but not integrated

## Build & Development Commands

### Development
```bash
# Start Metro bundler
npm start

# Run on iOS simulator (builds native code)
npx expo run:ios

# Clear cache and restart
npx expo start -c
```

### iOS Native Development
```bash
# Clean and rebuild iOS
cd ios && xcodebuild clean && cd ..
npx pod-install
npx expo run:ios

# Clean build (full)
cd ios
xcodebuild clean -workspace tapelab.xcworkspace -scheme tapelab
cd ..
npx expo run:ios

# Build specific target
xcodebuild -workspace ios/tapelab.xcworkspace -scheme tapelab \
  -configuration Debug -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  build CODE_SIGNING_ALLOWED=NO
```

### TypeScript
```bash
# Type check without emitting
npx tsc --noEmit
```

## Architecture

### High-Level Flow

```
React Native UI (TypeScript)
    ↓ (React Native Bridge)
Swift Native Audio Engine (AVAudioEngine)
    ↓
AVFoundation (iOS Core Audio)
```

### State Management Architecture

The app uses **Zustand + Immer** for state management with a clear separation:

1. **sessionStore** (`src/store/sessionStore.ts`): Single source of truth for session state
   - Tracks, regions, playhead position, recording state
   - Uses Immer for immutable updates
   - Actions: `addRegion`, `moveRegion`, `cropRegionStart`, `cropRegionEnd`, `armTrack`, `updateRegionEnd`, `setRegionLive`, `removeRegion`
   - Session management: `createSession`, `openSession`, `renameSession`

2. **transportStore** (`src/store/transportStore.ts`): Transport controls (stateless object, not Zustand store)
   - Orchestrates native audio engine calls
   - Handles recording lifecycle: `recordStart()` → `recordStop()` → `stop()`
   - **CRITICAL ORDER**: Always call `stopRecording()` BEFORE `stop()` when recording
   - Methods: `play()`, `stop()`, `seek()`, `recordStart()`, `recordStop()`

3. **selectors** (`src/store/selectors.ts`): Optimized state access via Zustand hooks
   - `useArmedTrack()`, `useRegionsByTrack()`, `useTrack()`, `useTracks()`
   - `useSessionDuration()`, `usePlayhead()`, `useIsPlaying()`, `useIsRecording()`

### React Native ↔ Swift Bridge

**Key Files:**
- `src/native/index.ts`: TypeScript interface to native module with mock fallback
- `ios/TapelabAudio/TapelabAudio.m`: Objective-C bridge declarations
- `ios/TapelabAudio/TapelabAudio.swift`: Swift implementation
- `ios/tapelab/tapelab-Bridging-Header.h`: Bridging header for Swift-ObjC interop

**Event Flow:**
- **JS → Native**: Calls methods via `TapelabAudio.*()` (promises)
- **Native → JS**: Emits events via `RCTEventEmitter` (e.g., `onPlayheadUpdate`)
- **Subscription**: Use `TapelabAudioEmitter.addListener('eventName', callback)`
- **Events**: `onPlayheadUpdate`, `onPlaybackTime`, `onPlaybackFinished`, `onRecordingFinished`

### Audio Engine Architecture (Swift)

**Current Signal Flow (Basic Implementation):**
```
Recording:
Input (mic) → Input Tap → AVAudioFile (write frames to disk)

Playback:
Region Files → AVAudioPlayerNode (per region) → Main Mixer → Output
```

**Note**: The following features are **NOT yet implemented** (stub methods only):
- ❌ Per-track mixers and volume/pan control
- ❌ EQ, reverb, delay effects
- ❌ AVAudioUnitVarispeed for tempo control
- ❌ Reverse playback (explicitly skipped in `preparePlaybackNodes`)

**Key Implementation Details:**

1. **Recording**:
   - Uses input tap on `engine.inputNode` with 4096 buffer size (TapelabAudio.swift:240)
   - Writes frames directly to `AVAudioFile` in real-time
   - Sample rate determined by input device format (not necessarily 48kHz)
   - Recording frame count tracked manually: `recordingFrameCount += buffer.frameLength`
   - **Headphones required**: `requireHeadphones()` throws error if not connected (TapelabAudio.swift:580-587)

2. **Playback**:
   - Each region gets its own `AVAudioPlayerNode` instance
   - Regions scheduled via `scheduleSegment(audioFile, startingFrame:, frameCount:, at:nil)`
   - Players connected directly to `engine.mainMixerNode`
   - Delayed playback for regions that start after seek position (TapelabAudio.swift:672-675)
   - Volume and pan applied per-player node (TapelabAudio.swift:662-663)

3. **Engine Lifecycle**:
   - **Cooldown mechanism**: 200ms delay between engine operations to prevent crashes (TapelabAudio.swift:548-559)
   - `performAfterEngineReady()` ensures operations wait for cooldown
   - Engine stopped and reset after each transport stop
   - Session deactivated when idle

4. **Playhead Sync**:
   - Timer fires every 50ms while `isPlaying == true` (TapelabAudio.swift:425)
   - Position calculated: `playheadPosition += delta * playbackRate` (TapelabAudio.swift:445)
   - Uses `CACurrentMediaTime()` for high-precision delta calculation (TapelabAudio.swift:441-443)
   - Emits `onPlayheadUpdate` and `onPlaybackTime` events
   - Auto-stops when reaching `sessionDuration` (360s)

### UI Component Hierarchy

```
App.tsx
  └─ SafeAreaProvider
      └─ NavigationContainer
          ├─ DashboardScreen (session list, create/open sessions)
          │   └─ SessionCard (x N, displays session metadata)
          └─ SessionScreen (main DAW interface)
              ├─ Header (back button, session name, time display)
              ├─ Timeline (horizontal scroll + ruler)
              │   ├─ Time ruler (ticks every 1s, labels every 10s)
              │   ├─ TrackLane (x4, renders regions)
              │   │   └─ RegionView (audio clips, blue=recorded, orange=live)
              │   ├─ Playhead (red line, draggable for seek)
              │   └─ Overlay (track labels + arm buttons)
              ├─ Transport (play/stop/record/rewind buttons)
              └─ WaveformView (SVG waveform - not yet integrated)
```

**Timeline Details:**
- **Zoom scale**: 15 pixels/second (fixed, `PIXELS_PER_SECOND`)
- **Total width**: 5400px for 360s (6 min) session
- **Track height**: 88px (`TRACK_ROW_HEIGHT`)
- **Playhead**: Receives `onPlayheadUpdate` events, updates position reactively
- **Playhead dragging**: `PanResponder` allows seek by dragging playhead (Timeline.tsx:48-65)
- **Ruler**: Major ticks at 10s intervals with time labels (mm:ss format)
- **Region colors**: Blue (#4A90E2) for recorded, Orange (#FF9F0A) for live recording

**DashboardScreen Details:**
- Lists all sessions sorted by creation date (newest first)
- Shows session metadata: track count, duration, sample rate
- Active session highlighted with orange border
- Create new session with "+ New Session" button

**Transport Controls:**
- Rewind (◀◀): Seek to 0
- Play (▶): Start playback from current playhead (green button)
- Stop (■): Stop playback/recording (orange button)
- Record (⏺): Start/stop recording on armed track (red button)
- Status indicators: Green dot for playing, red dot for recording

### Type System

**Core Types** (`src/types/session.ts`):
- `Seconds`: Type alias for number (time in seconds)
- `Session`: Top-level session with 4 tracks, duration=360s, sampleRate=48000
  - `id`, `name`, `duration`, `sampleRate`, `playhead`, `isPlaying`, `isRecording`
  - `tracks: Track[]`, `createdAt: number` (epoch timestamp)
- `Track`: Volume (0..1), pan (-1..1), EQ (low/mid/high dB), mute/solo/armed state
  - `regions: Region[]`
- `Region`: File URI, start/end time (absolute on timeline), offset (in file)
  - `reverse: boolean`, `fadeIn`, `fadeOut`, `isLive?: boolean`
  - `effects: { reverb?, delay?, saturation? }` (not yet functional)

**Audio Types** (`src/types/audio.ts`):
- `ScheduleRegion`: Flat structure for native bridge calls, includes track settings
- `RecordStopResult`: `{ duration: number; fileUri?: string }`

### File URI Handling

**CRITICAL**: Swift URL resolution functions redirect paths to Caches directory:

1. **prepareRecordingURL()** (TapelabAudio.swift:481-530):
   - Input: `file://recordings/recording-123.wav`
   - Actual path: `/path/to/app/Library/Caches/recordings/recording-123.wav`
   - Creates directories if needed
   - Deletes existing file if present
   - Handles absolute URLs (with host) and relative paths

2. **resolveExistingFileURL()** (TapelabAudio.swift:561-578):
   - Converts relative URIs to Caches-based absolute paths
   - Returns `nil` if file doesn't exist
   - Used for playback file resolution

**Reason**: iOS sandbox security, ensures all audio files are in writable location

## Directory Structure

```
tapelab/
├── src/
│   ├── components/
│   │   ├── RegionView.tsx       # Visual representation of audio region
│   │   ├── Timeline.tsx         # Main timeline with playhead and ruler
│   │   ├── TrackLane.tsx        # Single track row, renders regions
│   │   ├── Transport.tsx        # Transport controls UI
│   │   └── WaveformView.tsx     # SVG waveform (not yet integrated)
│   ├── screens/
│   │   ├── DashboardScreen.tsx  # Session list and creation
│   │   └── SessionScreen.tsx    # Main DAW interface
│   ├── store/
│   │   ├── sessionStore.ts      # Zustand store for session state
│   │   ├── transportStore.ts    # Transport control logic
│   │   └── selectors.ts         # Optimized Zustand selectors
│   ├── types/
│   │   ├── session.ts           # Session, Track, Region types
│   │   └── audio.ts             # Audio bridge types
│   ├── native/
│   │   └── index.ts             # TypeScript interface to native module
│   └── utils/
│       └── time.ts              # Time formatting (mm:ss, mm:ss.ms)
├── ios/
│   ├── TapelabAudio/
│   │   ├── TapelabAudio.m       # Objective-C bridge declarations
│   │   └── TapelabAudio.swift   # Swift audio engine implementation
│   └── tapelab/
│       ├── AppDelegate.swift    # Expo app delegate
│       └── tapelab-Bridging-Header.h
├── App.tsx                      # Root component with navigation
├── package.json                 # Dependencies (React Native, Zustand, etc.)
└── app.json                     # Expo config
```

## Common Patterns & Gotchas

### Recording Workflow

**Correct Order** (transportStore.ts:163-233):
```typescript
// START
recordStart() → TapelabAudio.startRecording() → engine starts, tap installed
              → addRegion() with isLive: true (creates orange region)
              → setActiveRecordingRegion() (tracks current recording)

// STOP (CRITICAL ORDER!)
recordStop() → TapelabAudio.stopRecording()  // FIRST: stop recording, get duration
            → updateRegionEnd() or removeRegion() based on duration
            → TapelabAudio.stop()             // SECOND: stop transport
```

**Why this matters**:
- If `stop()` is called before `stopRecording()`, the audio engine is stopped before the file is properly flushed
- `stopRecording()` calculates duration from `recordingFrameCount / sampleRate` (TapelabAudio.swift:287-289)
- If frames are not flushed, `recordingFrameCount` is 0, resulting in `duration: 0`

**Live Region Updates**:
- During recording, `onPlayheadUpdate` event triggers `updateRegionEnd()` (Timeline.tsx:77-79)
- Region grows in real-time as recording progresses
- Orange color indicates live recording (`isLive: true`)
- After stop, region turns blue and `isLive: false`

### Headphone Requirement for Recording

**IMPORTANT**: Recording requires headphones or Bluetooth output (TapelabAudio.swift:580-587)
- `requireHeadphones()` checks for: `.headphones`, `.bluetoothA2DP`, `.bluetoothLE`, `.bluetoothHFP`
- Throws error if only speaker output detected
- Reason: Prevents feedback loop between speaker and microphone
- Error message: "Recording requires headphones or Bluetooth output."

### Audio Session Management

**Current Implementation** (TapelabAudio.swift:598-620):
- **Recording**: `.playAndRecord` category, `.default` mode, options: `[.allowBluetooth, .allowBluetoothA2DP]`
- **Playback**: `.playAndRecord` category, `.default` mode, options: `[.defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP]`
- Session activated with `setActive(true, options: [.notifyOthersOnDeactivation])`
- Session deactivated on stop with `setActive(false)`
- Output routed to speaker for playback: `overrideOutputAudioPort(.speaker)`

**Note**: Both recording and playback use `.playAndRecord` category to support simultaneous recording and playback of other tracks.

### Engine Cooldown Mechanism

**Purpose**: Prevent crashes from rapid engine start/stop cycles

**Implementation** (TapelabAudio.swift:548-559):
```swift
private var engineCooldownDeadline: DispatchTime = .now()

private func markEngineCooldown() {
  engineCooldownDeadline = DispatchTime.now() + .milliseconds(200)
}

private func performAfterEngineReady(on queue: DispatchQueue, _ block: @escaping () -> Void) {
  let now = DispatchTime.now()
  if now >= engineCooldownDeadline {
    block()
  } else {
    queue.asyncAfter(deadline: engineCooldownDeadline, execute: block)
  }
}
```

**Usage**: All `startAt()` and `startRecording()` calls wrapped in `performAfterEngineReady()`

### Playhead Synchronization

**Native side** (TapelabAudio.swift:421-475):
- Timer created with `DispatchSource.makeTimerSource()`, fires every 50ms
- Position updated using delta time: `playheadPosition += delta * playbackRate`
- Delta calculated via `CACurrentMediaTime()` for high precision
- Emits both `onPlayheadUpdate` and `onPlaybackTime` events (for compatibility)
- Auto-stops at `sessionDuration` (360s) and emits `onPlaybackFinished`
- Timer only runs while `isPlaying == true`

**JS side** (Timeline.tsx:67-85):
- Subscribes to `onPlayheadUpdate` event via `TapelabAudioEmitter`
- Updates local state: `setPlayheadPosition(position)` (unless dragging)
- Updates sessionStore: `store.setPlayhead(position)`
- If recording, updates region end: `store.updateRegionEnd(activeRecordingRegionId, position)`
- Renders red line at: `left: position * PIXELS_PER_SECOND`

**Dragging** (Timeline.tsx:48-65):
- `PanResponder` tracks drag gestures
- During drag: local state updates only, `isDragging = true`
- On release: calls `TapelabAudio.seek()` and `transportStore.seek()`
- Prevents playhead updates from events while dragging

### Region Scheduling and Playback

**Scheduling Process** (transportStore.ts:236-270):
1. `buildScheduleRegions()` flattens all tracks/regions into `ScheduleRegion[]` array
2. Filters out invalid regions (no fileUri, zero duration)
3. Sends to native: `TapelabAudio.scheduleRegions(regions, startAt)`

**Native Playback** (TapelabAudio.swift:622-690):
1. Filters regions: `regions.filter { $0.endTime > seconds }` (skip past regions)
2. For each region:
   - Creates `AVAudioPlayerNode` and attaches to engine
   - Loads `AVAudioFile` from disk
   - Calculates frames: offset, seek position, remaining frames
   - Schedules segment: `player.scheduleSegment(audioFile, startingFrame:, frameCount:, at:nil)`
   - Applies volume and pan
   - Starts player with delay if region starts in future: `playbackQueue.asyncAfter(deadline: .now() + delay)`
3. Starts engine if not running
4. Stores players in `activePlayerNodes` for cleanup

**Region Limitations**:
- Reverse playback not implemented (TapelabAudio.swift:629-632)
- Fade in/out not implemented (stubs only)
- Effects (reverb, delay, saturation) not implemented (stubs only)

### Adding New Native Methods

**Step-by-Step Process:**

1. **Add TypeScript signature** to `src/native/index.ts`:
   ```typescript
   export interface TapelabAPI {
     myNewMethod(param: string): Promise<boolean>;
   }
   ```

2. **Add Objective-C bridge declaration** to `ios/TapelabAudio/TapelabAudio.m`:
   ```objc
   RCT_EXTERN_METHOD(myNewMethod:(NSString *)param
                     resolver:(RCTPromiseResolveBlock)resolve
                     rejecter:(RCTPromiseRejectBlock)reject)
   ```

3. **Implement Swift method** in `ios/TapelabAudio/TapelabAudio.swift`:
   ```swift
   @objc
   func myNewMethod(_ param: String,
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
     // Implementation
     resolve(true)
   }
   ```

4. **Threading considerations**:
   - Use `playbackQueue` or `recordingQueue` for audio operations
   - Use `DispatchQueue.main.async` for UI-thread operations (resolve/reject, sendEvent)
   - Wrap in `performAfterEngineReady()` if touching audio engine

5. **Error handling**:
   ```swift
   do {
     try performOperation()
     resolve(result)
   } catch {
     reject("error_code", "Error message", error)
   }
   ```

### Debugging Audio Issues

**Recording not capturing audio:**
- Check console for `[TapelabAudio] [REC] wrote X frames` logs (appears every 20 buffers, ~82k frames)
- Verify headphones connected (required by `requireHeadphones()`)
- Check audio session category: should be `.playAndRecord` while recording
- Verify engine is running: `engine.isRunning` must be true
- Check `recordingTapInstalled` is true
- Look for "Session activated for recording" log

**Recording duration is 0:**
- Check `stopRecording()` logs for frame count and sample rate
- Verify `recordingFrameCount > 0` before stopping
- Ensure tap is writing frames (check `[REC] wrote` logs)
- Confirm file exists on disk after recording

**Playhead not moving:**
- Check `supportedEvents()` includes `"onPlayheadUpdate"` (TapelabAudio.swift:84-91)
- Verify `startPlayheadTimerIfNeeded()` is called in `startAt()` (TapelabAudio.swift:118)
- Ensure `isPlaying` is true in Swift
- Check for playhead update events in JS: `TapelabAudioEmitter.addListener('onPlayheadUpdate', ...)`
- Look for "Engine started for playback" log

**Playback silent:**
- Verify region files exist on disk before scheduling
- Check `preparePlaybackNodes()` logs for region processing
- Look for "Failed to schedule region" errors
- Ensure engine is running: check "Engine started for playback" log
- Verify `activePlayerNodes` is not empty
- Check player volume and pan values (should be > 0)

**Engine crashes or hangs:**
- Check cooldown mechanism: 200ms delay between operations
- Look for rapid start/stop cycles
- Verify engine is stopped before reset
- Check for tap removal before stopping engine
- Ensure session deactivation on error

## Code References

When referencing code locations in commits or comments, use format: `file_path:line_number`

Examples:
- `TapelabAudio.swift:287` - Recording duration calculation in stopRecording()
- `Timeline.tsx:68` - Playhead update subscription
- `transportStore.ts:186` - Critical order comment for recording stop
- `sessionStore.ts:69` - addRegion implementation
