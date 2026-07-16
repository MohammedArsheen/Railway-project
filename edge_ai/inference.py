import time
import yaml
import requests
import argparse
from typing import Dict, Any

# Mocking cv2 (OpenCV) if not installed
try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False
    print("Warning: 'cv2' (opencv-python) package not found. Running in headless telemetry simulation mode.")

# Mocking YOLO import to ensure code runs and compiles without heavy dependencies in development
try:
    from ultralytics import YOLO
    HAS_ULTRALYTICS = True
except ImportError:
    HAS_ULTRALYTICS = False
    print("Warning: 'ultralytics' package not found. Running in simulation/mock mode.")

class RailVisionEdgeAI:
    def __init__(self, config_path: str):
        # Load configuration
        with open(config_path, 'r') as file:
            self.config = yaml.safe_load(file)
            
        self.train_id = self.config['system']['train_id']
        self.coach_id = self.config['system']['coach_id']
        self.update_interval = self.config['system']['update_interval_seconds']
        self.api_url = self.config['server']['api_url']
        self.max_capacity = self.config['constraints']['max_capacity']
        
        print(f"[Edge AI Init] Coach {self.coach_id} on Train {self.train_id} starting.")
        
        # Initialize YOLO Model (if package available)
        if HAS_ULTRALYTICS:
            print(f"Loading YOLO model: {self.config['model']['type']}...")
            self.model = YOLO(self.config['model']['weights_path'])
            if self.config['model']['tensorrt_optimization']:
                print("TensorRT acceleration enabled. Exporting model (if needed)...")
                # self.model.export(format='engine', device=self.config['model']['device'])
        else:
            self.model = None

    def capture_and_process(self):
        if not HAS_CV2:
            print("[Info] Running in Headless Telemetry Simulation Mode (no OpenCV/camera required).")
            last_update_time = 0
            try:
                while True:
                    current_time = time.time()
                    # Simulation mode: mock passenger count with periodic wave
                    import math
                    sine_wave = math.sin(current_time / 30.0)  # Complete cycle every ~3 minutes
                    # Map sine wave [-1, 1] to occupancy range [20, 95]
                    passenger_count = int(57.5 + (sine_wave * 37.5))
                    
                    # Calculate occupancy percentage
                    occupancy_percentage = min(int((passenger_count / self.max_capacity) * 100), 100)
                    
                    # Update Railway Server periodically
                    if current_time - last_update_time >= self.update_interval:
                        self.send_metadata(passenger_count, occupancy_percentage)
                        last_update_time = current_time
                        
                    time.sleep(1)
            except KeyboardInterrupt:
                print("\nShutting down RailVision Edge AI...")
            return

        # Open RTSP camera stream or fall back to web camera / mock simulation
        rtsp_url = self.config['camera']['rtsp_url']
        cap = cv2.VideoCapture(rtsp_url)
        
        if not cap.isOpened():
            print(f"[Warning] Failed to open RTSP stream: {rtsp_url}. Starting video simulation...")
            # Use 0 (webcam) or mock stream loop
            cap = cv2.VideoCapture(0)
            
        last_update_time = 0
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    print("Error: Failed to grab frame. Reconnecting...")
                    time.sleep(2)
                    cap = cv2.VideoCapture(rtsp_url)
                    continue
                
                current_time = time.time()
                
                # Perform AI Inference
                passenger_count = 0
                if self.model:
                    # Run YOLO person class detection (class index 0 for 'person' in COCO dataset)
                    results = self.model.predict(
                        source=frame, 
                        classes=[0],  # Detect only people
                        conf=self.config['model']['confidence_threshold'],
                        device=self.config['model']['device'],
                        verbose=False
                    )
                    
                    if len(results) > 0:
                        # Count the number of boxes detected
                        passenger_count = len(results[0].boxes)
                else:
                    # Simulation mode: mock passenger count with periodic wave
                    import math
                    sine_wave = math.sin(current_time / 30.0)  # Complete cycle every ~3 minutes
                    # Map sine wave [-1, 1] to occupancy range [20, 95]
                    passenger_count = int(57.5 + (sine_wave * 37.5))
                
                # Calculate occupancy percentage
                occupancy_percentage = min(int((passenger_count / self.max_capacity) * 100), 100)
                
                # Update Railway Server periodically
                if current_time - last_update_time >= self.update_interval:
                    self.send_metadata(passenger_count, occupancy_percentage)
                    last_update_time = current_time
                    
                # Optional: Render display for local Jetson HDMI output/debugging
                # Draw detections, crowd stats, etc. on frame
                cv2.putText(frame, f"Coach: {self.coach_id} | Live Pax: {passenger_count}", (30, 50),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                cv2.putText(frame, f"Occupancy: {occupancy_percentage}%", (30, 90),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                
                # Show window (if GUI is supported)
                # cv2.imshow("RailVision AI - Live Edge Stream", frame)
                
                # Break loop on 'q' press
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
                    
        except KeyboardInterrupt:
            print("\nShutting down RailVision Edge AI...")
        finally:
            cap.release()
            cv2.destroyAllWindows()

    def send_metadata(self, passenger_count: int, occupancy_percentage: int):
        payload_url = f"{self.api_url}/{self.train_id}/coach/{self.coach_id}"
        params = {
            "occupancy": occupancy_percentage,
            "passenger_count": passenger_count
        }
        
        try:
            response = requests.post(payload_url, params=params, timeout=self.config['server']['timeout_seconds'])
            if response.status_code == 200:
                print(f"[Edge AI Update] Sent Occupancy to Server: {occupancy_percentage}% ({passenger_count} Pax)")
            else:
                print(f"[Edge AI Update Error] Server returned code {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"[Edge AI Update Error] Failed to connect to server: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RailVision AI Edge Inference Client")
    parser.add_argument("--config", default="config.yaml", help="Path to config yaml file")
    args = parser.parse_args()
    
    edge_ai = RailVisionEdgeAI(args.config)
    edge_ai.capture_and_process()
