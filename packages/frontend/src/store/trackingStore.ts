import { create } from 'zustand';

// Face data interface
export interface FaceData {
  detected: boolean;
  landmarks_count?: number;
  bounding_box?: {
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
    width: number;
    height: number;
  };
  key_points?: {
    left_eye: { x: number; y: number };
    right_eye: { x: number; y: number };
    nose_tip: { x: number; y: number };
    mouth_center: { x: number; y: number };
  };
  head_pose?: {
    tilt: number;
    turn: number;
  };
  expressions?: { [key: string]: number };
  mouth_features?: {
    mouth_open: boolean;
    mouth_open_ratio: number;
    smile_score: number;
    is_smiling: boolean;
    mouth_width: number;
  };
  engagement?: {
    score: number;
    head_straightness: number;
    eye_engagement: number;
    is_engaged: boolean;
  };
  timestamp: number;
}

// Hand data interface
export interface HandData {
  detected: boolean;
  landmarks?: Array<{ x: number; y: number; z: number }>;
  gesture: string;
  position: { x: number; y: number; z?: number };
  confidence: number;
  fingers?: {
    thumb: boolean;
    index: boolean;
    middle: boolean;
    ring: boolean;
    pinky: boolean;
  };
  timestamp: number;
}

// Body pose data interface
export interface BodyPoseData {
  detected: boolean;
  landmarks?: Array<{ x: number; y: number; z: number }>;
  landmarks_count?: number;
  posture?: 'standing' | 'sitting' | 'leaning' | 'unknown';
  orientation?: {
    pitch: number;
    yaw: number;
    roll: number;
  };
  key_points?: {
    nose?: { x: number; y: number };
    left_shoulder?: { x: number; y: number };
    right_shoulder?: { x: number; y: number };
    left_hip?: { x: number; y: number };
    right_hip?: { x: number; y: number };
  };
  timestamp: number;
}

// Eye tracking data interface
export interface EyeTrackingData {
  left_eye: {
    gaze_direction: { x: number; y: number; z: number };
    iris_position: { x: number; y: number };
    is_open: boolean;
    eye_height?: number;
  };
  right_eye: {
    gaze_direction: { x: number; y: number; z: number };
    iris_position: { x: number; y: number };
    is_open: boolean;
    eye_height?: number;
  };
  combined_gaze: { x: number; y: number; z: number };
  attention_score: number;
}

// Unified tracking data interface
export interface TrackingData {
  face: FaceData | null;
  hands: {
    left: HandData | null;
    right: HandData | null;
  };
  body: BodyPoseData | null;
  eyes: EyeTrackingData | null;
  timestamp: number;
}

interface TrackingStore {
  currentTracking: TrackingData | null;
  trackingHistory: TrackingData[];
  setTracking: (data: TrackingData) => void;
  clearTracking: () => void;
  getContext: () => string;
  getContextSummary: () => string;
}

export const useTrackingStore = create<TrackingStore>((set, get) => ({
  currentTracking: null,
  trackingHistory: [],
  
  setTracking: (data) =>
    set((state) => ({
      currentTracking: data,
      trackingHistory: [...state.trackingHistory.slice(-19), data], // Keep last 20
    })),
  
  clearTracking: () =>
    set({ currentTracking: null, trackingHistory: [] }),
  
  getContext: () => {
    const tracking = get().currentTracking;
    if (!tracking) return 'No tracking data available';
    
    const parts: string[] = [];
    
    // Face context
    if (tracking.face?.detected) {
      if (tracking.face.engagement?.is_engaged) {
        parts.push('Face: Engaged');
      }
      if (tracking.face.mouth_features?.is_smiling) {
        parts.push('Expression: Smiling');
      }
      if (tracking.face.expressions) {
        const topExpression = Object.entries(tracking.face.expressions)
          .filter(([name]) => name !== '_neutral')
          .sort(([, a], [, b]) => (b as number) - (a as number))[0];
        if (topExpression && (topExpression[1] as number) > 0.1) {
          parts.push(`Expression: ${topExpression[0]}`);
        }
      }
    }
    
    // Hand context
    const leftHand = tracking.hands?.left;
    const rightHand = tracking.hands?.right;
    if (leftHand?.detected) {
      parts.push(`Left hand: ${leftHand.gesture}`);
    }
    if (rightHand?.detected) {
      parts.push(`Right hand: ${rightHand.gesture}`);
    }
    
    // Body context
    if (tracking.body?.detected) {
      parts.push(`Posture: ${tracking.body.posture || 'unknown'}`);
    }
    
    // Eye context
    if (tracking.eyes) {
      const gazeX = tracking.eyes.combined_gaze.x;
      if (gazeX < -0.3) parts.push('Gaze: Left');
      else if (gazeX > 0.3) parts.push('Gaze: Right');
      if (tracking.eyes.attention_score > 0.7) {
        parts.push('Attention: High');
      }
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'No active tracking';
  },
  
  getContextSummary: () => {
    const tracking = get().currentTracking;
    if (!tracking) return 'No context available';
    
    const parts: string[] = [];
    
    // Gesture summary
    const gestures: string[] = [];
    if (tracking.hands?.left?.detected && tracking.hands.left.gesture !== 'unknown') {
      gestures.push(`L:${tracking.hands.left.gesture}`);
    }
    if (tracking.hands?.right?.detected && tracking.hands.right.gesture !== 'unknown') {
      gestures.push(`R:${tracking.hands.right.gesture}`);
    }
    if (gestures.length > 0) {
      parts.push(gestures.join(' '));
    }
    
    // Face summary
    if (tracking.face?.detected) {
      if (tracking.face.engagement?.is_engaged) {
        parts.push('👁️ Engaged');
      }
      if (tracking.face.mouth_features?.is_smiling) {
        parts.push('😊');
      }
    }
    
    // Body summary
    if (tracking.body?.detected && tracking.body.posture) {
      parts.push(`🧍 ${tracking.body.posture}`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'No context available';
  },
}));
