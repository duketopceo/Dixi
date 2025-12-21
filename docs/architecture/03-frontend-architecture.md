# Frontend Component Architecture

Detailed architecture of the React frontend application.

## Component Overview

```mermaid
graph TB
    subgraph "Entry Point"
        Main[main.tsx]
        App[App.tsx]
    end

    subgraph "Components"
        ControlPanel[ControlPanel.tsx]
        GestureIndicator[GestureIndicator.tsx]
        ProjectionCanvas[ProjectionCanvas.tsx]
        ProjectionScene[ProjectionScene.tsx]
        AIResponse[AIResponseDisplay.tsx]
        DebugLog[DebugLog.tsx]
    end

    subgraph "State Management (Zustand)"
        GestureStore[gestureStore.ts]
        AIStore[aiStore.ts]
        DebugStore[debugStore.ts]
    end

    subgraph "Services"
        APIService[api.ts]
        WSHook[useWebSocket.ts]
    end

    subgraph "External"
        Backend[Backend API<br/>:3001]
        WSServer[WebSocket<br/>:3001]
    end

    Main --> App
    App --> ControlPanel
    App --> GestureIndicator
    App --> ProjectionCanvas
    App --> AIResponse
    App --> DebugLog

    ProjectionCanvas --> ProjectionScene

    ControlPanel --> APIService
    ControlPanel --> GestureStore

    GestureIndicator --> GestureStore
    AIResponse --> AIStore
    DebugLog --> DebugStore

    App --> WSHook
    WSHook --> GestureStore
    WSHook --> AIStore
    WSHook --> DebugStore

    APIService --> Backend
    WSHook --> WSServer

    style App fill:#4fc3f7
    style GestureStore fill:#81c784
    style AIStore fill:#ba68c8
    style DebugStore fill:#9e9e9e
```

## Directory Structure

```
packages/frontend/
├── src/
│   ├── main.tsx                    # Application entry
│   ├── App.tsx                     # Root component
│   ├── components/
│   │   ├── ControlPanel.tsx        # Control buttons
│   │   ├── GestureIndicator.tsx    # Gesture visualization
│   │   ├── ProjectionCanvas.tsx    # 3D canvas container
│   │   ├── ProjectionScene.tsx     # Three.js scene
│   │   ├── AIResponseDisplay.tsx   # AI response UI
│   │   └── DebugLog.tsx           # Debug console
│   ├── hooks/
│   │   └── useWebSocket.ts        # WebSocket hook
│   ├── services/
│   │   └── api.ts                 # API client
│   ├── store/
│   │   ├── gestureStore.ts        # Gesture state
│   │   ├── aiStore.ts             # AI state
│   │   └── debugStore.ts          # Debug state
│   └── styles/
│       └── index.css              # Global styles
├── public/
│   └── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Core Components

### 1. App Component (App.tsx)

```mermaid
graph TB
    App[App Component]
    
    subgraph "Layout"
        Header[Header Section]
        Main[Main Content Area]
        Sidebar[Sidebar Panel]
    end

    subgraph "Main Content"
        Canvas[Projection Canvas<br/>3D WebGL]
        Indicator[Gesture Indicator<br/>Overlay]
    end

    subgraph "Sidebar"
        Controls[Control Panel]
        AI[AI Response Display]
        Debug[Debug Log]
    end

    App --> Header
    App --> Main
    App --> Sidebar

    Main --> Canvas
    Main --> Indicator

    Sidebar --> Controls
    Sidebar --> AI
    Sidebar --> Debug

    style App fill:#4fc3f7
    style Canvas fill:#81c784
    style Indicator fill:#ffb74d
    style Controls fill:#ba68c8
```

**Responsibilities:**
- Root layout and structure
- Initialize WebSocket connection
- Coordinate global state
- Handle app-level lifecycle

**Key Features:**
- Responsive grid layout
- Dark theme by default
- WebSocket connection management
- Error boundary (future)

---

### 2. Control Panel Component

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Starting : Click Start
    Starting --> Tracking : Success
    Starting --> Error : Failure
    Tracking --> Stopping : Click Stop
    Stopping --> Idle : Success
    Error --> Idle : Retry
    
    Tracking --> Tracking : Gesture Events
```

**UI Elements:**
- **Start Tracking Button** - Initiates gesture detection
- **Stop Tracking Button** - Stops gesture detection
- **Status Indicator** - Shows tracking state
- **Health Check Display** - Service status
- **Settings Panel** (future) - Configuration options

**State Management:**
```typescript
interface ControlPanelState {
  isTracking: boolean;
  isLoading: boolean;
  error: string | null;
  health: HealthStatus | null;
}
```

**Interactions:**
- Calls `/api/gesture/start` to begin
- Calls `/api/gesture/stop` to end
- Displays real-time status from WebSocket
- Shows error messages on failures

---

### 3. Gesture Indicator Component

```mermaid
graph TB
    GestureData[Gesture Data from Store]
    
    subgraph "Gesture Indicator"
        Type[Gesture Type Display]
        Position[Position Indicator]
        Confidence[Confidence Bar]
        Emoji[Gesture Emoji]
    end

    subgraph "Visual Effects"
        Glow[Glow Effect]
        Animation[Slide Animation]
        FadeOut[Fade on Timeout]
    end

    GestureData --> Type
    GestureData --> Position
    GestureData --> Confidence
    GestureData --> Emoji

    Type --> Glow
    Position --> Animation
    Confidence --> FadeOut

    style Type fill:#4fc3f7
    style Emoji fill:#ffb74d
    style Glow fill:#ba68c8
```

**Display Elements:**
- **Gesture Type** - Name of detected gesture
- **Emoji Icon** - Visual representation
- **Confidence Level** - Percentage and progress bar
- **Position Marker** - X/Y coordinates on canvas
- **Timestamp** - Time of detection

**Gesture Type Mapping:**
```typescript
const GESTURE_EMOJIS = {
  wave: '👋',
  point: '👉',
  pinch: '🤏',
  swipe_left: '⬅️',
  swipe_right: '➡️',
  swipe_up: '⬆️',
  swipe_down: '⬇️',
  fist: '✊',
  open_palm: '✋',
  thumbs_up: '👍',
  thumbs_down: '👎',
  peace: '✌️',
  ok: '👌',
  unknown: '❓'
};
```

**Animation Behavior:**
- Slide in from right on new gesture
- Pulse effect on high confidence (>0.9)
- Fade out after 3 seconds
- Position marker follows hand location

---

### 4. Projection Canvas Component

```mermaid
graph TB
    Canvas[ProjectionCanvas]
    
    subgraph "Three.js Setup"
        Scene[Three.js Scene]
        Camera[Perspective Camera]
        Renderer[WebGL Renderer]
        Controls[Orbit Controls]
    end

    subgraph "3D Objects"
        Lights[Lighting Setup]
        Objects[3D Objects]
        Particles[Particle Systems]
        Effects[Post-Processing]
    end

    subgraph "Interactions"
        Raycaster[Mouse Raycaster]
        GestureMapping[Gesture → 3D Action]
    end

    Canvas --> Scene
    Scene --> Camera
    Scene --> Renderer
    Scene --> Controls

    Scene --> Lights
    Scene --> Objects
    Scene --> Particles
    Scene --> Effects

    Canvas --> Raycaster
    Canvas --> GestureMapping

    style Canvas fill:#4fc3f7
    style Scene fill:#81c784
    style Objects fill:#ba68c8
```

**React Three Fiber Integration:**
```tsx
<Canvas>
  <PerspectiveCamera position={[0, 0, 5]} />
  <OrbitControls />
  <ambientLight intensity={0.5} />
  <pointLight position={[10, 10, 10]} />
  <ProjectionScene />
</Canvas>
```

**Gesture → 3D Mappings:**
- **Wave** - Spawn particle burst
- **Point** - Raycast and select object
- **Pinch** - Grab and move object
- **Swipe** - Rotate camera
- **Fist** - Delete selected object
- **Open Palm** - Create new object

---

### 5. Projection Scene Component

```mermaid
graph TB
    Scene[ProjectionScene]
    
    subgraph "Scene Objects"
        Grid[Grid Helper]
        Axes[Axis Helper]
        Objects[User Objects]
    end

    subgraph "Gesture Responses"
        Wave[Wave → Particles]
        Point[Point → Selection]
        Pinch[Pinch → Transform]
    end

    subgraph "Animation Loop"
        Update[Update Objects]
        Render[Render Frame]
    end

    Scene --> Grid
    Scene --> Axes
    Scene --> Objects

    Objects --> Wave
    Objects --> Point
    Objects --> Pinch

    Scene --> Update
    Update --> Render

    style Scene fill:#81c784
    style Objects fill:#ba68c8
    style Render fill:#4fc3f7
```

**3D Objects:**
- Interactive cubes, spheres, and custom meshes
- Particle effects for gesture feedback
- Grid and axis helpers for spatial reference

**Animation Features:**
- Smooth transitions with `react-spring`
- Physics-based movements (future)
- Gesture-driven animations

---

### 6. AI Response Display Component

```mermaid
graph TB
    AIData[AI Data from Store]
    
    subgraph "Display Elements"
        Query[Query Text]
        Response[Response Text]
        Metadata[Metadata Panel]
        Timestamp[Time Display]
    end

    subgraph "UI Features"
        Markdown[Markdown Rendering]
        Syntax[Code Highlighting]
        Copy[Copy Button]
        History[Response History]
    end

    AIData --> Query
    AIData --> Response
    AIData --> Metadata
    AIData --> Timestamp

    Response --> Markdown
    Response --> Syntax
    Response --> Copy
    AIData --> History

    style Response fill:#ba68c8
    style Markdown fill:#4fc3f7
    style History fill:#81c784
```

**Display Format:**
```
┌─────────────────────────────────┐
│ 🤖 AI Response                  │
├─────────────────────────────────┤
│ Query: "What is gesture...?"    │
│                                 │
│ Response text here with         │
│ markdown support...             │
│                                 │
│ Model: llama3.2:latest          │
│ Time: 1.2s | Tokens: 45         │
└─────────────────────────────────┘
```

**Features:**
- Markdown rendering for formatted text
- Code syntax highlighting
- Copy to clipboard button
- Scrollable response history
- Metadata display (model, time, tokens)

---

### 7. Debug Log Component

```mermaid
graph TB
    DebugData[Debug Data from Store]
    
    subgraph "Log Display"
        Filter[Log Level Filter]
        Messages[Message List]
        AutoScroll[Auto-scroll Toggle]
        Clear[Clear Button]
    end

    subgraph "Message Types"
        Info[ℹ️ Info]
        Warn[⚠️ Warning]
        Error[❌ Error]
        Success[✅ Success]
    end

    DebugData --> Filter
    Filter --> Messages
    Messages --> AutoScroll

    Messages --> Info
    Messages --> Warn
    Messages --> Error
    Messages --> Success

    style Messages fill:#9e9e9e
    style Error fill:#f44336
    style Success fill:#4caf50
```

**Log Entry Format:**
```
[21:00:00] ℹ️ WebSocket connected
[21:00:01] ✅ Gesture tracking started
[21:00:02] 👋 Wave gesture detected (92%)
[21:00:03] ⚠️ AI service slow response
[21:00:04] ❌ Camera unavailable
```

**Features:**
- Color-coded by log level
- Timestamps for each entry
- Filterable by log level
- Auto-scroll to latest entry
- Clear log button
- Export logs (future)

---

## State Management (Zustand)

### Gesture Store

```typescript
interface GestureState {
  currentGesture: Gesture | null;
  gestureHistory: Gesture[];
  isTracking: boolean;
  setCurrentGesture: (gesture: Gesture) => void;
  addToHistory: (gesture: Gesture) => void;
  setTracking: (tracking: boolean) => void;
  clearHistory: () => void;
}
```

**Store Structure:**
```mermaid
graph TB
    Store[Gesture Store]
    
    subgraph "State"
        Current[currentGesture]
        History[gestureHistory]
        Tracking[isTracking]
    end

    subgraph "Actions"
        Set[setCurrentGesture]
        Add[addToHistory]
        SetTrack[setTracking]
        Clear[clearHistory]
    end

    Store --> Current
    Store --> History
    Store --> Tracking

    Store --> Set
    Store --> Add
    Store --> SetTrack
    Store --> Clear

    style Store fill:#81c784
```

---

### AI Store

```typescript
interface AIState {
  currentResponse: AIResponse | null;
  responseHistory: AIResponse[];
  isGenerating: boolean;
  setCurrentResponse: (response: AIResponse) => void;
  addToHistory: (response: AIResponse) => void;
  setGenerating: (generating: boolean) => void;
  clearHistory: () => void;
}
```

**Store Structure:**
```mermaid
graph TB
    Store[AI Store]
    
    subgraph "State"
        Current[currentResponse]
        History[responseHistory]
        Generating[isGenerating]
    end

    subgraph "Actions"
        Set[setCurrentResponse]
        Add[addToHistory]
        SetGen[setGenerating]
        Clear[clearHistory]
    end

    Store --> Current
    Store --> History
    Store --> Generating

    Store --> Set
    Store --> Add
    Store --> SetGen
    Store --> Clear

    style Store fill:#ba68c8
```

---

### Debug Store

```typescript
interface DebugState {
  logs: LogEntry[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  addLog: (log: LogEntry) => void;
  setLogLevel: (level: string) => void;
  clearLogs: () => void;
}
```

---

## Services & Hooks

### API Service (api.ts)

```typescript
class APIService {
  private baseUrl: string;

  async startGestureTracking(): Promise<void>;
  async stopGestureTracking(): Promise<void>;
  async getGesture(): Promise<Gesture>;
  async sendAIQuery(query: string, context?: string): Promise<AIResponse>;
  async getHealth(): Promise<HealthStatus>;
}
```

**Methods:**
- `startGestureTracking()` - POST /api/gesture/start
- `stopGestureTracking()` - POST /api/gesture/stop
- `getGesture()` - GET /api/gesture
- `sendAIQuery()` - POST /api/ai/infer
- `getHealth()` - GET /api/health/deep

---

### WebSocket Hook (useWebSocket.ts)

```typescript
interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: any;
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
  send: (message: any) => void;
}

function useWebSocket(url: string): UseWebSocketReturn;
```

**Event Handling:**
```mermaid
sequenceDiagram
    participant Hook
    participant WS
    participant Store

    Hook->>WS: Connect
    WS->>Hook: onopen
    Hook->>Store: Update connection state
    
    WS->>Hook: onmessage (gesture)
    Hook->>Store: Update gesture store
    
    WS->>Hook: onmessage (ai_response)
    Hook->>Store: Update AI store
    
    WS->>Hook: onerror
    Hook->>Store: Update error state
    
    WS->>Hook: onclose
    Hook->>Store: Update connection state
```

**Features:**
- Automatic reconnection on disconnect
- Message type routing
- Connection state management
- Error handling and logging

---

## Component Communication

```mermaid
graph TB
    WebSocket[WebSocket Messages]
    
    subgraph "Stores"
        GestureStore[Gesture Store]
        AIStore[AI Store]
        DebugStore[Debug Store]
    end

    subgraph "Components"
        Indicator[Gesture Indicator]
        Canvas[Projection Canvas]
        AI[AI Display]
        Debug[Debug Log]
        Controls[Control Panel]
    end

    WebSocket --> GestureStore
    WebSocket --> AIStore
    WebSocket --> DebugStore

    GestureStore --> Indicator
    GestureStore --> Canvas
    GestureStore --> Controls

    AIStore --> AI
    AIStore --> Canvas

    DebugStore --> Debug

    style WebSocket fill:#4fc3f7
    style GestureStore fill:#81c784
    style AIStore fill:#ba68c8
```

**Data Flow:**
1. WebSocket receives message
2. Hook routes to appropriate store
3. Store updates state
4. Components re-render reactively
5. UI reflects new state

---

## Styling and Theme

### CSS Variables

```css
:root {
  --bg-primary: #0a0a0a;
  --bg-secondary: #1a1a1a;
  --bg-tertiary: #2a2a2a;
  
  --text-primary: #ffffff;
  --text-secondary: #b0b0b0;
  --text-tertiary: #808080;
  
  --accent-primary: #4fc3f7;
  --accent-secondary: #81c784;
  --accent-ai: #ba68c8;
  
  --success: #4caf50;
  --warning: #ff9800;
  --error: #f44336;
  --info: #2196f3;
}
```

### Component Styling

```mermaid
graph TB
    Theme[Global Theme]
    
    subgraph "Layout"
        Grid[CSS Grid]
        Flex[Flexbox]
        Responsive[Media Queries]
    end

    subgraph "Effects"
        Gradients[Background Gradients]
        Shadows[Box Shadows]
        Animations[CSS Animations]
        Transitions[Smooth Transitions]
    end

    Theme --> Grid
    Theme --> Flex
    Theme --> Responsive

    Theme --> Gradients
    Theme --> Shadows
    Theme --> Animations
    Theme --> Transitions

    style Theme fill:#ba68c8
```

---

## Performance Optimization

### 1. React Optimization
- `React.memo()` for pure components
- `useMemo()` for expensive calculations
- `useCallback()` for stable function references
- Virtual scrolling for long lists

### 2. WebGL Optimization
- Geometry instancing for repeated objects
- Level of detail (LOD) switching
- Frustum culling
- Texture compression

### 3. State Updates
- Debounced gesture updates
- Batched WebSocket messages
- Selective re-renders with Zustand

---

## Testing Strategy

### Unit Tests
- Component rendering
- Store actions
- Hook behavior
- Utility functions

### Integration Tests
- WebSocket message handling
- API service calls
- Store-component interaction

### E2E Tests (Playwright)
- User gesture flow
- AI query flow
- Error handling

---

*Last updated: 2025-12-21*
