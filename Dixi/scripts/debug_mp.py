import mediapipe
print(f"Mediapipe version: {mediapipe.__version__}")
print(f"Mediapipe dir: {dir(mediapipe)}")
try:
    import mediapipe.python.solutions as solutions
    print("✅ Successfully imported mediapipe.python.solutions")
except ImportError as e:
    print(f"❌ Failed to import mediapipe.python.solutions: {e}")
