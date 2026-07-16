from pydantic import BaseModel, Field
from typing import List, Optional

class CoachOccupancy(BaseModel):
    coach_id: str = Field(..., description="Unique identifier for the coach (e.g., A1, B1, W1)")
    occupancy_percentage: int = Field(..., ge=0, le=100, description="Estimated occupancy percentage")
    passenger_count: int = Field(..., ge=0, description="Detected passenger count")
    status: str = Field(..., description="Occupancy status: Low, Medium, High")
    color: str = Field(..., description="Visual color indicator: Green, Yellow, Red")
    is_women_only: bool = Field(default=False, description="Flag indicating if the coach is reserved for women")
    is_first_class: bool = Field(default=False, description="Flag indicating if the coach is First Class")
    is_differently_abled: bool = Field(default=False, description="Flag indicating if the coach is for Differently-Abled (Divyangjan)")

class TrainStatus(BaseModel):
    train_id: str = Field(..., description="Train number or ID")
    train_name: str = Field(..., description="Name of the train")
    origin_station: str = Field(..., description="Starting station of the journey")
    departure_time: str = Field(..., description="Departure time from origin")
    current_station: str = Field(..., description="Currently approaching or halted station")
    destination_station: str = Field(..., description="Final destination station")
    expected_arrival_time: str = Field(..., description="Expected arrival time at destination")
    halt_duration: str = Field(..., description="Halt time at the current station (e.g., '2 Minutes')")
    coaches: List[CoachOccupancy] = Field(default=[], description="List of coaches and their live occupancy status")
