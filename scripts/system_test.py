import cv2
import mediapipe as mp
import numpy as np
import requests
import sys
import time
import os

def test_camera():
    print("--- Testing Camera Access ---")
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ FAILED: Could not open camera (ID 0)")
        return False
    
    ret, frame = cap.read()
    if not ret:
        print("❌ FAILED: Could not read frame from camera")
        cap.release()
        return False
    
    print(f"✅ SUCCESS: Camera accessed. Resolution: {frame.shape[1]}x{frame.shape[0]}")
    cap.release()
    return True

def test_mediapipe():
    print("\n--- Testing Modern MediaPipe Tasks API Loading ---")
    try:
        from mediapipe.tasks import python
        from mediapipe.tasks.python import vision
        print("✅ SUCCESS: MediaPipe Tasks API available")
        
        model_path = "packages/vision/hand_landmarker.task"
        if os.path.exists(model_path):
            print(f"✅ SUCCESS: Model file found at {model_path}")
            return True
        else:
            print(f"❌ FAILED: Model file NOT found at {model_path}")
            return False
    except Exception as e:
        print(f"❌ FAILED: Could not load MediaPipe Tasks API: {e}")
        return False

def test_service_health():
    print("\n--- Testing Service Connectivity ---")
    services = {
        "Vision Service": "http://localhost:5000/health",
        "Backend Service": "http://localhost:3001/health",
        "Frontend (port 3000)": "http://localhost:3000",
        "Frontend (port 5173)": "http://localhost:5173"
    }
    
    for name, url in services.items():
        try:
            response = requests.get(url, timeout=2)
            if response.status_code < 400:
                print(f"✅ SUCCESS: {name} is reachable")
            else:
                print(f"⚠️ WARNING: {name} returned status code {response.status_code}")
        except Exception as e:
            print(f"❌ FAILED: {name} is NOT reachable at {url}")
            print(f"   Error: {str(e)} (expected if service not running)")

def main():
    print("========================================")
    print("   DIXI SYSTEM COMPREHENSIVE TEST      ")
    print("========================================\n")
    
    camera_ok = test_camera()
    model_ok = test_mediapipe()
    test_service_health()
    
    print("\n========================================")
    if camera_ok and model_ok:
        print("🏁 SYSTEM HEALTH: PRE-FLIGHT CHECKS PASSED")
    else:
        print("🏁 SYSTEM HEALTH: ISSUES DETECTED")
    print("========================================")

if __name__ == "__main__":
    main()
