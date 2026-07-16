from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import TrainStatus, CoachOccupancy
from typing import List
import uvicorn

app = FastAPI(
    title="RailVision AI Server",
    description="Real-time passenger guidance and coach occupancy server for Indian Railways",
    version="1.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def generate_backend_coaches(seed: int) -> List[CoachOccupancy]:
    coaches = []
    for pos in range(1, 14):
        is_women_only = False
        is_first_class = False
        is_differently_abled = False
        
        # Layout mapping out of 13:
        # Pos 3, 4, 5: Divyangjan (D1, D2, D3)
        # Pos 6, 7: First Class (FC1, FC2)
        # Pos 8: Women's (GS3 is WOMEN only)
        if pos in [3, 4, 5]:
            coach_id = f"D{pos-2}"
            is_differently_abled = True
        elif pos in [6, 7]:
            coach_id = f"FC{pos-5}"
            is_first_class = True
        else:
            gs_idx = pos
            if pos > 8:
                gs_idx = pos - 5
            elif pos == 8:
                gs_idx = 3
                is_women_only = True
            elif pos > 5:
                gs_idx = pos - 3
            coach_id = f"GS{gs_idx}"
            
        factor = (seed + pos * 17) % 100
        if is_differently_abled:
            occupancy_percentage = int(factor * 0.3) + 5
        elif is_first_class:
            occupancy_percentage = int(factor * 0.55) + 15
        elif is_women_only:
            occupancy_percentage = int(factor * 0.5) + 25
        else:
            if pos <= 2 or pos >= 11:
                occupancy_percentage = int(factor * 0.35) + 65
            else:
                occupancy_percentage = int(factor * 0.55) + 20
                
        max_capacity = 50 if is_first_class else (30 if is_differently_abled else 100)
        passenger_count = round((occupancy_percentage / 100) * max_capacity)
        
        status = "Low"
        color = "Green"
        if occupancy_percentage >= 80:
            status = "High"
            color = "Red"
        elif occupancy_percentage >= 50:
            status = "Medium"
            color = "Yellow"
            
        coaches.append(CoachOccupancy(
            coach_id=coach_id,
            occupancy_percentage=occupancy_percentage,
            passenger_count=passenger_count,
            status=status,
            color=color,
            is_women_only=is_women_only,
            is_first_class=is_first_class,
            is_differently_abled=is_differently_abled
        ))
    return coaches

# In-memory database initialized with realistic mock data based on the hackathon requirements
train_database = {
    "12635": TrainStatus(
        train_id="12635",
        train_name="Chennai Beach - Sengottai Express (MEMU)",
        origin_station="Chennai Beach",
        departure_time="08:35 AM",
        current_station="Tambaram (Platform 1)",
        destination_station="Sengottai",
        expected_arrival_time="09:25 AM",
        halt_duration="03 Minutes",
        coaches=generate_backend_coaches(12)
    ),
    "12612": TrainStatus(
        train_id="12612",
        train_name="Chennai Central - Mangalore Central (MEMU)",
        origin_station="Chennai Central",
        departure_time="08:37 AM",
        current_station="Tambaram (Platform 2)",
        destination_station="Mangalore Central",
        expected_arrival_time="09:28 AM",
        halt_duration="02 Minutes",
        coaches=generate_backend_coaches(45)
    ),
    "17230": TrainStatus(
        train_id="17230",
        train_name="Kakinada Port - Chennai Egmore (MEMU)",
        origin_station="Kakinada Port",
        departure_time="08:40 AM",
        current_station="Tambaram (Platform 3)",
        destination_station="Chennai Egmore",
        expected_arrival_time="09:30 AM",
        halt_duration="04 Minutes",
        coaches=generate_backend_coaches(87)
    ),
    "12685": TrainStatus(
        train_id="12685",
        train_name="Kanniyakumari - Chennai Central (MEMU)",
        origin_station="Kanniyakumari",
        departure_time="08:42 AM",
        current_station="Tambaram (Platform 4)",
        destination_station="Chennai Central",
        expected_arrival_time="09:32 AM",
        halt_duration="02 Minutes",
        coaches=generate_backend_coaches(99)
    )
}

@app.get("/")
def read_root():
    return {"message": "Welcome to RailVision AI Server. Live API is running."}

@app.get("/api/train/{train_id}", response_model=TrainStatus)
def get_train_status(train_id: str):
    if train_id not in train_database:
        raise HTTPException(status_code=404, detail="Train not found")
    return train_database[train_id]

@app.post("/api/train/{train_id}/coach/{coach_id}", response_model=CoachOccupancy)
def update_coach_occupancy(train_id: str, coach_id: str, occupancy: int, passenger_count: int):
    if train_id not in train_database:
        raise HTTPException(status_code=404, detail="Train not found")
    
    train = train_database[train_id]
    coach_found = False
    
    # Calculate status and color
    if occupancy >= 75:
        status = "High"
        color = "Red"
    elif occupancy >= 40:
        status = "Medium"
        color = "Yellow"
    else:
        status = "Low"
        color = "Green"
        
    for coach in train.coaches:
        if coach.coach_id == coach_id:
            coach.occupancy_percentage = occupancy
            coach.passenger_count = passenger_count
            coach.status = status
            coach.color = color
            coach_found = True
            return coach
            
    if not coach_found:
        # Create a new coach if it doesn't exist
        is_women = coach_id.lower().startswith('w')
        is_fc = coach_id.lower().startswith('fc')
        is_da = coach_id.lower().startswith('da')
        new_coach = CoachOccupancy(
            coach_id=coach_id,
            occupancy_percentage=occupancy,
            passenger_count=passenger_count,
            status=status,
            color=color,
            is_women_only=is_women,
            is_first_class=is_fc,
            is_differently_abled=is_da
        )
        train.coaches.append(new_coach)
        return new_coach

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
