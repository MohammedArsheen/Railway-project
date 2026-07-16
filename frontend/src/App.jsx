import React, { useState, useEffect, useRef } from 'react';
import { 
  Train, 
  Activity, 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  ArrowRight, 
  Settings, 
  Tv, 
  Clock, 
  MapPin, 
  RotateCcw,
  Sparkles,
  Camera
} from 'lucide-react';
import './App.css';
import trainBannerImg from './assets/suburban_train_banner.png';

// Helper to generate a seat & aisle crowd heatmap grid inside a coach
function getCoachHeatCells(occupancyPercentage) {
  const rows = 5; // 2 seat rows, 1 aisle, 2 seat rows
  const cols = 15; // length of coach
  const totalCells = rows * cols;
  
  const occupiedCount = Math.round((occupancyPercentage / 100) * totalCells);
  const cells = Array.from({ length: totalCells }, (_, index) => {
    const r = Math.floor(index / cols);
    const c = index % cols;
    const isAisle = r === 2;
    const isDoorArea = c <= 2 || c >= 12;
    
    return { r, c, isAisle, isDoorArea, type: 'empty' };
  });

  // Simple deterministic layout based on occupancy
  let count = 0;
  // 1. Fill seats first
  for (let i = 0; i < totalCells; i++) {
    if (count >= occupiedCount) break;
    const cell = cells[i];
    if (!cell.isAisle) {
      cell.type = 'seated';
      count++;
    }
  }
  // 2. Fill aisle with standing
  for (let i = 0; i < totalCells; i++) {
    if (count >= occupiedCount) break;
    const cell = cells[i];
    if (cell.isAisle && !cell.isDoorArea) {
      cell.type = 'standing';
      count++;
    }
  }
  // 3. Fill door areas with congested if occupancy is high
  for (let i = 0; i < totalCells; i++) {
    if (count >= occupiedCount) break;
    const cell = cells[i];
    if (cell.isDoorArea) {
      cell.type = occupancyPercentage >= 80 ? 'congested' : 'standing';
      count++;
    }
  }
  
  return cells;
}

// Helper to generate 13 compartments with realistic details based on image specifications
function generateCoaches(trainId) {
  const dataMap = {
    "12635": [
      { id: "GS1", pct: 78, type: "general" },
      { id: "GS2", pct: 92, type: "general" },
      { id: "D1", pct: 45, type: "disabled" },
      { id: "D2", pct: 48, type: "disabled" },
      { id: "D3", pct: 40, type: "disabled" },
      { id: "FC1", pct: 60, type: "firstclass" },
      { id: "FC2", pct: 55, type: "firstclass" },
      { id: "GS3", pct: 40, type: "general", is_women_only: true },
      { id: "GS4", pct: 35, type: "general" },
      { id: "GS5", pct: 55, type: "general" },
      { id: "GS6", pct: 68, type: "general" },
      { id: "GS7", pct: 72, type: "general" },
      { id: "GS8", pct: 65, type: "general" }
    ],
    "12612": [
      { id: "GS1", pct: 80, type: "general" },
      { id: "GS2", pct: 88, type: "general" },
      { id: "D1", pct: 30, type: "disabled" },
      { id: "D2", pct: 35, type: "disabled" },
      { id: "D3", pct: 40, type: "disabled" },
      { id: "FC1", pct: 50, type: "firstclass" },
      { id: "FC2", pct: 52, type: "firstclass" },
      { id: "GS3", pct: 42, type: "general", is_women_only: true },
      { id: "GS4", pct: 38, type: "general" },
      { id: "GS5", pct: 60, type: "general" },
      { id: "GS6", pct: 65, type: "general" },
      { id: "GS7", pct: 55, type: "general" },
      { id: "GS8", pct: 70, type: "general" }
    ],
    "17230": [
      { id: "GS1", pct: 65, type: "general" },
      { id: "GS2", pct: 78, type: "general" },
      { id: "D1", pct: 22, type: "disabled" },
      { id: "D2", pct: 28, type: "disabled" },
      { id: "D3", pct: 30, type: "disabled" },
      { id: "FC1", pct: 40, type: "firstclass" },
      { id: "FC2", pct: 45, type: "firstclass" },
      { id: "GS3", pct: 30, type: "general", is_women_only: true },
      { id: "GS4", pct: 28, type: "general" },
      { id: "GS5", pct: 45, type: "general" },
      { id: "GS6", pct: 52, type: "general" },
      { id: "GS7", pct: 60, type: "general" },
      { id: "GS8", pct: 65, type: "general" }
    ],
    "12685": [
      { id: "GS1", pct: 90, type: "general" },
      { id: "GS2", pct: 95, type: "general" },
      { id: "D1", pct: 60, type: "disabled" },
      { id: "D2", pct: 65, type: "disabled" },
      { id: "D3", pct: 70, type: "disabled" },
      { id: "FC1", pct: 72, type: "firstclass" },
      { id: "FC2", pct: 75, type: "firstclass" },
      { id: "GS3", pct: 70, type: "general", is_women_only: true },
      { id: "GS4", pct: 68, type: "general" },
      { id: "GS5", pct: 80, type: "general" },
      { id: "GS6", pct: 85, type: "general" },
      { id: "GS7", pct: 90, type: "general" },
      { id: "GS8", pct: 92, type: "general" }
    ]
  };

  const config = dataMap[trainId] || dataMap["12635"];
  return config.map(c => {
    const is_women_only = c.is_women_only || false;
    const is_first_class = c.type === "firstclass";
    const is_differently_abled = c.type === "disabled";

    const maxCapacity = is_first_class ? 50 : is_differently_abled ? 30 : 100;
    const passenger_count = Math.round((c.pct / 100) * maxCapacity);

    let status = "Low";
    let color = "Green";
    if (c.pct >= 80) {
      status = "High";
      color = "Red";
    } else if (c.pct >= 50) {
      status = "Medium";
      color = "Yellow";
    }

    return {
      coach_id: c.id,
      occupancy_percentage: c.pct,
      passenger_count,
      status,
      color,
      is_women_only,
      is_first_class,
      is_differently_abled
    };
  });
}

// 5-Track Platform definition matching the first image's platform layouts
const PLATFORMS_DATA = [
  { id: 1, type: "active", train_id: "12635", name: "Platform 1" },
  { id: 2, type: "active", train_id: "12612", name: "Platform 2" },
  { id: 3, type: "active", train_id: "17230", name: "Platform 3" },
  { id: 4, type: "active", train_id: "12685", name: "Platform 4" },
  { id: 5, type: "empty", name: "Platform 5", info: "No train currently halted" }
];

// Initial train details matching Chennai local routes exactly
const INITIAL_TRAINS = {
  "12635": {
    train_id: "12635",
    train_name: "Chennai Beach - Sengottai Express (MEMU)",
    origin_station: "Chennai Beach",
    departure_time: "08:35 AM",
    current_station: "Tambaram (Platform 1)",
    destination_station: "Sengottai",
    expected_arrival_time: "09:25 AM",
    halt_duration: "03 Minutes",
    platform: 1,
    direction: "rtl",
    coaches: generateCoaches("12635")
  },
  "12612": {
    train_id: "12612",
    train_name: "Chennai Central - Mangalore Central (MEMU)",
    origin_station: "Chennai Central",
    departure_time: "08:37 AM",
    current_station: "Tambaram (Platform 2)",
    destination_station: "Mangalore Central",
    expected_arrival_time: "09:28 AM",
    halt_duration: "02 Minutes",
    platform: 2,
    direction: "ltr",
    coaches: generateCoaches("12612")
  },
  "17230": {
    train_id: "17230",
    train_name: "Kakinada Port - Chennai Egmore (MEMU)",
    origin_station: "Kakinada Port",
    departure_time: "08:40 AM",
    current_station: "Tambaram (Platform 3)",
    destination_station: "Chennai Egmore",
    expected_arrival_time: "09:30 AM",
    halt_duration: "04 Minutes",
    platform: 3,
    direction: "rtl",
    coaches: generateCoaches("17230")
  },
  "12685": {
    train_id: "12685",
    train_name: "Kanniyakumari - Chennai Central (MEMU)",
    origin_station: "Kanniyakumari",
    departure_time: "08:42 AM",
    current_station: "Tambaram (Platform 4)",
    destination_station: "Chennai Central",
    expected_arrival_time: "09:32 AM",
    halt_duration: "02 Minutes",
    platform: 4,
    direction: "ltr",
    coaches: generateCoaches("12685")
  }
};

function App() {
  const [activeTab, setActiveTab] = useState('admin'); // Set 'admin' as default tab to make it look like the dashboard immediately
  const [trains, setTrains] = useState(INITIAL_TRAINS);
  const [selectedTrainId, setSelectedTrainId] = useState("12635");
  const [selectedCoachId, setSelectedCoachId] = useState("GS1");
  const [isArriving, setIsArriving] = useState(false);
  const [isSimulating, setIsSimulating] = useState(true);
  const [animationSessionId, setAnimationSessionId] = useState(Date.now());

  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString(), message: "System Initialized. Connected to Southern Railways Chennai Yard CCTV nodes.", type: "info" },
    { time: new Date().toLocaleTimeString(), message: "5-Track platform monitoring online. Ready to read edge telemetry.", type: "success" }
  ]);
  
  const logsEndRef = useRef(null);

  const activeTrain = trains[selectedTrainId] || trains["12635"];

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Try to fetch from central backend, fall back to simulation
  useEffect(() => {
    const fetchBackendData = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/train/${selectedTrainId}`);
        if (response.ok) {
          const data = await response.json();
          setTrains(prev => {
            const updatedTrain = { ...prev[selectedTrainId] };
            updatedTrain.train_name = data.train_name;
            updatedTrain.origin_station = data.origin_station;
            updatedTrain.destination_station = data.destination_station;
            updatedTrain.departure_time = data.departure_time;
            updatedTrain.expected_arrival_time = data.expected_arrival_time;
            updatedTrain.halt_duration = data.halt_duration;
            
            // Map coaches from backend if backend returns 22 coaches
            if (data.coaches && data.coaches.length === 22) {
              updatedTrain.coaches = data.coaches;
            }
            
            return { ...prev, [selectedTrainId]: updatedTrain };
          });
          addLog(`Fetched live central API update for Train ${selectedTrainId}.`, 'info');
        }
      } catch (err) {
        // Backend not running/unreachable, fallback silently to local mock simulation
      }
    };

    fetchBackendData();
    const interval = setInterval(fetchBackendData, 5000);
    return () => clearInterval(interval);
  }, [selectedTrainId]);

  // Live Simulation loop to drift passenger count and occupancy
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setTrains(prevTrains => {
        const updated = { ...prevTrains };
        // Select random active train to drift
        const trainIds = Object.keys(updated);
        const randomTrainId = trainIds[Math.floor(Math.random() * trainIds.length)];
        const train = updated[randomTrainId];
        
        // Select random coach out of 22
        const coachIndex = Math.floor(Math.random() * train.coaches.length);
        const coach = { ...train.coaches[coachIndex] };
        
        const maxCapacity = coach.is_first_class ? 50 : coach.is_differently_abled ? 30 : 100;
        const delta = Math.floor(Math.random() * 9) - 4; // -4 to +4
        let newCount = Math.max(1, coach.passenger_count + delta);
        newCount = Math.min(newCount, maxCapacity);
        
        const newPercent = Math.round((newCount / maxCapacity) * 100);
        let newStatus = "Low";
        let newColor = "Green";
        
        if (newPercent >= 75) {
          newStatus = "High";
          newColor = "Red";
        } else if (newPercent >= 40) {
          newStatus = "Medium";
          newColor = "Yellow";
        }

        train.coaches[coachIndex] = {
          ...coach,
          passenger_count: newCount,
          occupancy_percentage: newPercent,
          status: newStatus,
          color: newColor
        };

        if (randomTrainId === selectedTrainId) {
          addLog(`Edge AI [Train ${randomTrainId} - Coach ${coach.coach_id}]: Passengers: ${newCount}/${maxCapacity} (${newPercent}%, ${newStatus})`, newStatus.toLowerCase());
        }

        return updated;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isSimulating, selectedTrainId]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { time: timestamp, message, type }]);
  };

  const handleSelectTrain = (trainId) => {
    if (trainId === selectedTrainId) return;
    setIsArriving(true);
    setSelectedTrainId(trainId);
    
    // Set default coach of new train
    const targetTrain = trains[trainId];
    if (targetTrain && targetTrain.coaches.length > 0) {
      setSelectedCoachId(targetTrain.coaches[0].coach_id);
    }
    
    addLog(`Switched focus to Platform ${targetTrain.platform}: ${targetTrain.train_name} (${trainId})`, 'info');
    
    // Reset arrival animation state
    setTimeout(() => {
      setIsArriving(false);
      addLog(`Platform ${targetTrain.platform} Live camera feeds updated successfully.`, 'success');
    }, 1800);
  };

  const handleDirectionChange = (dir) => {
    setTrains(prev => {
      const updated = { ...prev };
      const train = updated[selectedTrainId];
      
      // Swap origin & destination for realistic transit loop
      const oldOrigin = train.origin_station;
      train.origin_station = train.destination_station;
      train.destination_station = oldOrigin;
      train.direction = dir;
      
      // Update departure times slightly to show realistic changes
      train.departure_time = dir === 'rtl' ? "10:15 AM" : "09:40 AM";
      train.expected_arrival_time = dir === 'rtl' ? "11:55 AM" : "11:15 AM";
      
      return updated;
    });
    
    setIsArriving(true);
    addLog(`Rerouting: Train ${selectedTrainId} travel direction changed to ${dir === 'ltr' ? 'Beach → Chengalpattu (LTR)' : 'Chengalpattu → Beach (RTL)'}.`, 'info');
    setTimeout(() => {
      setIsArriving(false);
    }, 1800);
  };

  const handleSimulatePeak = () => {
    setTrains(prev => {
      const updated = { ...prev };
      const train = updated[selectedTrainId];
      train.coaches = train.coaches.map(c => {
        const cap = c.is_first_class ? 50 : c.is_differently_abled ? 30 : 100;
        const count = Math.floor(cap * 0.82) + Math.floor(Math.random() * (cap * 0.15));
        const percent = Math.round((count / cap) * 100);
        return {
          ...c,
          passenger_count: count,
          occupancy_percentage: percent,
          status: "High",
          color: "Red"
        };
      });
      return updated;
    });
    addLog(`Simulator: Forced peak hour occupancy levels for Train ${selectedTrainId}.`, "danger");
  };

  const handleSimulateOffPeak = () => {
    setTrains(prev => {
      const updated = { ...prev };
      const train = updated[selectedTrainId];
      train.coaches = train.coaches.map(c => {
        const cap = c.is_first_class ? 50 : c.is_differently_abled ? 30 : 100;
        const count = Math.floor(cap * 0.1) + Math.floor(Math.random() * (cap * 0.2));
        const percent = Math.round((count / cap) * 100);
        const status = percent >= 40 ? "Medium" : "Low";
        const color = percent >= 40 ? "Yellow" : "Green";
        return {
          ...c,
          passenger_count: count,
          occupancy_percentage: percent,
          status,
          color
        };
      });
      return updated;
    });
    addLog(`Simulator: Set low off-peak morning density for Train ${selectedTrainId}.`, "success");
  };

  const handleResetSimulation = () => {
    setTrains(INITIAL_TRAINS);
    addLog("Simulator: Restored default railway timetable telemetry.", "info");
  };



  // Metrics for Admin Dashboard
  const activeTrainsList = Object.values(trains);
  const totalPassengersAllTrains = activeTrainsList.reduce((sum, t) => {
    return sum + t.coaches.reduce((cSum, c) => cSum + c.passenger_count, 0);
  }, 0);
  
  const avgOccupancyActive = Math.round(
    activeTrain.coaches.reduce((sum, c) => sum + c.occupancy_percentage, 0) / activeTrain.coaches.length
  );
  
  const crowdedCoachesActive = activeTrain.coaches.filter(c => c.status === "High").length;

  // Dynamic Live Alerts & Camera Status Calculations based on active trains
  const getLiveAlerts = () => {
    const alertList = [];
    Object.values(trains).forEach((t) => {
      t.coaches.forEach((c) => {
        if (c.occupancy_percentage >= 80) {
          alertList.push({
            id: `occ-${t.train_id}-${c.coach_id}`,
            coach: `GS${c.coach_id.replace('GS','') || c.coach_id} (Platform ${t.platform})`,
            platform: t.platform,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            desc: `Occupancy above ${c.occupancy_percentage}%`
          });
        }
      });
    });
    
    // Mock 1 offline camera to match the donut display
    alertList.push({
      id: 'cam-offline-17230-GS4',
      coach: 'Camera GS4 (Platform 3)',
      platform: 3,
      time: '08:45 AM',
      desc: 'Camera disconnected'
    });

    return alertList.slice(0, 3);
  };

  const activeAlerts = getLiveAlerts();
  const totalCameras = activeTrainsList.length * 13;
  const onlineCameras = totalCameras - 1;
  const cameraOnlinePercentage = Math.round((onlineCameras / totalCameras) * 100);

  const getSpecialBorderClass = (c) => {
    if (c.is_women_only) return 'border-women';
    if (c.is_first_class) return 'border-firstclass';
    if (c.is_differently_abled) return 'border-disabled';
    return '';
  };

  const getSpecialBadgeClass = (c) => {
    if (c.is_women_only) return 'badge-women';
    if (c.is_first_class) return 'badge-firstclass';
    if (c.is_differently_abled) return 'badge-disabled';
    return `badge-${c.status.toLowerCase()}`;
  };

  const getSpecialLabel = (c) => {
    if (c.is_women_only) return 'Women';
    if (c.is_first_class) return '1st Class';
    if (c.is_differently_abled) return 'Divyangjan';
    return c.status;
  };

  // Render locomotive visual
  const renderEngineCab = (side) => (
    <div className={`engine-cab engine-${side}`}>
      <div className="coach-wheels">
        <div className="wheel"></div>
        <div className="wheel"></div>
      </div>
      <div className="engine-window"></div>
      <div className="engine-headlight"></div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: side === 'right' ? 'flex-end' : 'flex-start' }}>
        <span className="engine-title">WAP-7</span>
        <span className="engine-sub">Locomotive</span>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      {/* Header bar */}
      <header className="header-bar glass">
        <div className="logo-section">
          <div className="logo-icon">
            <Train size={32} strokeWidth={2.5} />
          </div>
          <div className="logo-text">
            <h1>RailVision AI</h1>
            <span>Smart Occupancy & Passenger Guidance System</span>
          </div>
        </div>
        <nav className="nav-tabs">
          <button 
            className={`tab-btn ${activeTab === 'platform' ? 'active' : ''}`}
            onClick={() => setActiveTab('platform')}
          >
            <Tv size={16} /> Platform Display
          </button>
          <button 
            className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('admin');
              setAnimationSessionId(Date.now());
            }}
          >
            <Settings size={16} /> Admin Console
          </button>
        </nav>
      </header>

      {/* Main Tab Views */}
      <main className="main-content">
        {activeTab === 'platform' ? (
          <div className="platform-display animate-fade-in">
            {/* Journey Information Board */}
            <div className="announcement-board glass card-interactive">
              <div className="announcement-item">
                <span className="announcement-label">Active Platform</span>
                <span className="announcement-value highlight">Platform {activeTrain.platform}</span>
              </div>
              <div className="announcement-item">
                <span className="announcement-label">Train Name & ID</span>
                <span className="announcement-value highlight">{activeTrain.train_id} - {activeTrain.train_name}</span>
              </div>
              <div className="announcement-item">
                <span className="announcement-label">Origin & Destination</span>
                <span className="announcement-value">{activeTrain.origin_station} → {activeTrain.destination_station}</span>
              </div>
              <div className="announcement-item">
                <span className="announcement-label">Current Halt Status</span>
                <span className="announcement-value highlight"><MapPin size={16} style={{ marginRight: 4, verticalAlign: 'middle', display: 'inline' }} /> {activeTrain.current_station}</span>
              </div>
              <div className="announcement-item">
                <span className="announcement-label">Schedule timings</span>
                <span className="announcement-value time"><Clock size={16} style={{ marginRight: 4, verticalAlign: 'middle', display: 'inline' }} /> Exp: {activeTrain.expected_arrival_time}</span>
              </div>
              <div className="announcement-item">
                <span className="announcement-label">Scheduled Halt Duration</span>
                <span className="announcement-value time highlight">{activeTrain.halt_duration}</span>
              </div>
            </div>

            {/* 5-Track Yard Layout Panel */}
            <div className="occupancy-grid-container glass card-interactive">
              <div className="grid-header">
                <div className="grid-title">
                  <h2>5-Track Station Yard Layout (Guindy Station)</h2>
                  <p>Click on any active platform train (Platforms 1, 2, 3) to load detailed passenger guidance.</p>
                </div>
                <div className="legend">
                  <div className="legend-item">
                    <div className="legend-dot dot-low"></div> Low (&lt;40%)
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot dot-medium"></div> Medium (40%-74%)
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot dot-high"></div> High (&ge;75%)
                  </div>
                  <div className="legend-item">
                    <span className="badge badge-women" style={{ fontSize: '0.65rem', border: '1.5px solid hsl(var(--women))' }}>Women (Pink Border)</span>
                  </div>
                  <div className="legend-item">
                    <span className="badge badge-firstclass" style={{ fontSize: '0.65rem', border: '1.5px solid hsl(var(--firstclass))' }}>First Class (Gold)</span>
                  </div>
                  <div className="legend-item">
                    <span className="badge badge-disabled" style={{ fontSize: '0.65rem', border: '1.5px solid hsl(var(--disabled))' }}>Divyangjan (Purple)</span>
                  </div>
                </div>
              </div>

              {/* 5 Tracks Rendered */}
              <div className="yard-layout">
                {PLATFORMS_DATA.map((plat) => {
                  const isActive = plat.type === "active";
                  const isSelected = selectedTrainId === plat.train_id;
                  const trainObj = isActive ? trains[plat.train_id] : null;

                  return (
                    <div 
                      key={plat.id}
                      className={`track-row ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''}`}
                      onClick={() => isActive && handleSelectTrain(plat.train_id)}
                    >
                      <div className="track-info-header">
                        <span className="platform-badge">{plat.name}</span>
                        {isActive ? (
                          <>
                            <span className="train-route-label">
                              <strong>Train {trainObj.train_id}</strong>: {trainObj.origin_station} to {trainObj.destination_station} Local
                            </span>
                            <span className="track-status-tag status-halted">Halted at Station</span>
                          </>
                        ) : (
                          <>
                            <span className="empty-track-info">{plat.info}</span>
                            <span className="track-status-tag status-approaching">Arriving Next</span>
                          </>
                        )}
                      </div>

                      {/* Render Detailed 22-Coach Layout Directly on Track */}
                      {isActive ? (
                        <div 
                          key={`${plat.train_id}-${trainObj.direction}-${isSelected}`}
                          className={`direct-track-visualizer anim-${trainObj.direction}`}
                        >
                          {trainObj.direction === 'rtl' && <div className="direct-engine left"><span>WAP-7</span></div>}
                          
                          <div className="direct-coaches-container">
                            {trainObj.coaches.map((c, i) => {
                              let specialClass = '';
                              if (c.is_women_only) specialClass = 'women-only';
                              else if (c.is_first_class) specialClass = 'firstclass-only';
                              else if (c.is_differently_abled) specialClass = 'disabled-only';

                              return (
                                <div 
                                  key={i}
                                  className={`direct-coach-block ${c.status.toLowerCase()} ${specialClass}`}
                                  title={`Coach: ${c.coach_id} (${getSpecialLabel(c)}) - Occupancy: ${c.occupancy_percentage}% (${c.passenger_count} passengers)`}
                                >
                                  <div className="dc-header">{c.coach_id}</div>
                                  <div className="dc-percent">{c.occupancy_percentage}%</div>
                                </div>
                              );
                            })}
                          </div>

                          {trainObj.direction === 'ltr' && <div className="direct-engine right"><span>WAP-7</span></div>}
                        </div>
                      ) : (
                        <div className="empty-track-line"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>


          </div>
        ) : (
          <div className="admin-layout">
            <div className="admin-main-col">
              {/* Welcome Banner */}
              <div className="admin-welcome-banner">
                <div className="banner-left">
                  <h2>Welcome, Admin</h2>
                  <h3>Tambaram Station</h3>
                  <p>
                    <Sparkles size={16} style={{ color: 'hsl(var(--primary))' }} />
                    Real-time monitoring of local trains (MEMU & Suburban)
                  </p>
                </div>
                <img 
                  src={trainBannerImg} 
                  alt="Suburban Train Banner" 
                  className="banner-mid-image" 
                />
                <div className="banner-right-stats">
                  <h4>Today at Tambaram</h4>
                  <div className="banner-stat-row">
                    <span className="banner-stat-label">Local Trains Halted</span>
                    <span className="banner-stat-value highlight">36</span>
                  </div>
                  <div className="banner-stat-row">
                    <span className="banner-stat-label">Total Passengers Travelled</span>
                    <span className="banner-stat-value">1,18,560</span>
                  </div>
                </div>
              </div>

              {/* Platform Overview */}
              <div className="platform-overview-panel animate-fade-in card-interactive">
                <div className="platform-overview-header">
                  <div className="grid-title">
                    <h2>Platform Overview</h2>
                    <p>Live occupancy of local trains at Tambaram Station</p>
                  </div>
                  <select className="platform-select-dropdown" defaultValue="all">
                    <option value="all">All Platforms</option>
                    <option value="p1">Platform 1</option>
                    <option value="p2">Platform 2</option>
                    <option value="p3">Platform 3</option>
                    <option value="p4">Platform 4</option>
                    <option value="p5">Platform 5</option>
                  </select>
                </div>

                <div key={animationSessionId} className="platform-tracks-list">
                  {PLATFORMS_DATA.map((plat) => {
                    const isActive = plat.type === "active";
                    const isSelected = selectedTrainId === plat.train_id;
                    const trainObj = isActive ? trains[plat.train_id] : null;

                    return (
                  <div 
                    key={plat.id}
                    className={`admin-track-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => isActive && handleSelectTrain(plat.train_id)}
                  >
                    <div className="track-info-header">
                      <span className="platform-badge">{plat.name}</span>
                      {isActive ? (
                        <>
                          <span className="train-route-label">
                            <strong>Train {trainObj.train_id}</strong>: {trainObj.origin_station} → {trainObj.destination_station}
                          </span>
                          <span className="track-status-tag status-halted">Halted</span>
                        </>
                      ) : (
                        <>
                          <span className="empty-track-info">{plat.info}</span>
                          <span className="track-status-tag status-approaching">No train halted</span>
                        </>
                      )}
                    </div>

                    {/* Render Detailed 13-Coach Layout */}
                    {isActive ? (
                      <div className={`direct-track-visualizer anim-${trainObj.direction}`}>
                        {trainObj.direction === 'ltr' && (
                              <div className="direct-engine left">
                                <span>WAP-7</span>
                              </div>
                            )}
                            
                            <div className="direct-coaches-container">
                              {trainObj.coaches.map((c, i) => {
                                let borderClass = '';
                                if (c.is_women_only) borderClass = 'women-only';
                                else if (c.is_first_class) borderClass = 'firstclass-only';
                                else if (c.is_differently_abled) borderClass = 'disabled-only';

                                return (
                                  <div 
                                    key={i}
                                    className={`direct-coach-block ${c.status.toLowerCase()} ${borderClass}`}
                                    title={`Coach: ${c.coach_id} (${c.is_women_only ? 'Women' : c.is_first_class ? '1st Class' : c.is_differently_abled ? 'Divyangjan' : 'General'}) - Occupancy: ${c.occupancy_percentage}%`}
                                  >
                                    <div className="dc-header">{c.coach_id}</div>
                                    <div className="dc-percent">{c.occupancy_percentage}%</div>
                                  </div>
                                );
                              })}
                            </div>

                            {trainObj.direction === 'rtl' && (
                              <div className="direct-engine right">
                                <span>WAP-7</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="empty-track-line"></div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="admin-legend">
                  <div className="legend-item">
                    <div className="legend-dot dot-low"></div> Low (&lt;50%)
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot dot-medium"></div> Medium (50%-79%)
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot dot-high"></div> High (&ge;80%)
                  </div>
                  <div className="legend-item">
                    <span className="badge badge-women" style={{ fontSize: '0.65rem', border: '1.5px solid hsl(var(--women))' }}>WOMEN (Pink Border)</span>
                  </div>
                  <div className="legend-item">
                    <span className="badge badge-firstclass" style={{ fontSize: '0.65rem', border: '1.5px solid hsl(var(--firstclass))' }}>1st CLASS (Gold Border)</span>
                  </div>
                  <div className="legend-item">
                    <span className="badge badge-disabled" style={{ fontSize: '0.65rem', border: '1.5px solid hsl(var(--disabled))' }}>DIVYANGJAN (Purple Border)</span>
                  </div>
                  <div className="legend-item">
                    <span className="badge badge-low" style={{ fontSize: '0.65rem', color: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary))' }}>WAP-7 / Engine (Blue)</span>
                  </div>
                </div>
              </div>

              {/* Selected Train Deep-Dive Analysis */}
              {activeTrain && (
                <div className="selected-train-deepdive animate-fade-in card-interactive">
                  <div className="deepdive-header">
                    <div className="deepdive-train-info">
                      <h3>Train Detail Analysis: {activeTrain.train_id}</h3>
                      <p>{activeTrain.train_name}</p>
                    </div>
                    <span className="badge badge-low" style={{ textTransform: 'none' }}>
                      Platform {activeTrain.platform} • Local Telemetry Active
                    </span>
                  </div>

                  {/* Dynamic Stats Grid */}
                  <div className="deepdive-stats-grid">
                    <div className="deepdive-stat-card">
                      <div className="deepdive-stat-icon">
                        <MapPin size={18} />
                      </div>
                      <div className="deepdive-stat-content">
                        <span className="deepdive-stat-label">Origin & Destination</span>
                        <span className="deepdive-stat-val" style={{ fontSize: '0.85rem' }}>
                          {activeTrain.origin_station} → {activeTrain.destination_station}
                        </span>
                      </div>
                    </div>

                    <div className="deepdive-stat-card">
                      <div className="deepdive-stat-icon">
                        <Clock size={18} />
                      </div>
                      <div className="deepdive-stat-content">
                        <span className="deepdive-stat-label">Halt Duration</span>
                        <span className="deepdive-stat-val">{activeTrain.halt_duration}</span>
                      </div>
                    </div>

                    <div className="deepdive-stat-card">
                      <div className="deepdive-stat-icon">
                        <Users size={18} />
                      </div>
                      <div className="deepdive-stat-content">
                        <span className="deepdive-stat-label">Passengers inside Train</span>
                        <span className="deepdive-stat-val">
                          {activeTrain.coaches.reduce((sum, c) => sum + c.passenger_count, 0)}
                        </span>
                      </div>
                    </div>

                    <div className="deepdive-stat-card">
                      <div className="deepdive-stat-icon">
                        <TrendingUp size={18} />
                      </div>
                      <div className="deepdive-stat-content">
                        <span className="deepdive-stat-label">Departed at Tambaram</span>
                        <span className="deepdive-stat-val">
                          {Math.round(activeTrain.coaches.reduce((sum, c) => sum + c.passenger_count, 0) * 0.18)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Schematic Interactive Selection */}
                  <div className="heatmap-layout-wrapper">
                    <div className="heatmap-instruction">
                      <strong>Compartment Selection Heatmap:</strong> Click any coach below to view passenger layout distribution.
                    </div>
                    <div className="train-schematic-row">
                      {activeTrain.direction === 'ltr' && (
                        <div className="schematic-engine-btn left">
                          WAP-7
                        </div>
                      )}
                      
                      {activeTrain.coaches.map((c) => {
                        const isSelCoach = selectedCoachId === c.coach_id;
                        let coachTypeClass = '';
                        if (c.is_women_only) coachTypeClass = 'women';
                        else if (c.is_first_class) coachTypeClass = 'first';
                        else if (c.is_differently_abled) coachTypeClass = 'divyang';

                        return (
                          <div
                            key={c.coach_id}
                            className={`schematic-coach-btn ${c.status.toLowerCase()} ${coachTypeClass} ${isSelCoach ? 'selected' : ''}`}
                            onClick={() => setSelectedCoachId(c.coach_id)}
                          >
                            <span className="schematic-coach-label">{c.coach_id}</span>
                            <span className="schematic-coach-percent">{c.occupancy_percentage}%</span>
                          </div>
                        );
                      })}

                      {activeTrain.direction === 'rtl' && (
                        <div className="schematic-engine-btn right">
                          WAP-7
                        </div>
                      )}
                    </div>

                    {/* Inner Compartment Jetson CCTV Edge AI Analytics */}
                    {activeTrain.coaches.find(c => c.coach_id === selectedCoachId) && (() => {
                      const coach = activeTrain.coaches.find(c => c.coach_id === selectedCoachId);
                      const totalOcc = coach.occupancy_percentage;
                      
                      // Compute zone densities
                      const leftVestibule = Math.min(100, Math.round(totalOcc * 1.12));
                      const seatingBay = Math.round(totalOcc * 0.88);
                      const rightVestibule = Math.min(100, Math.round(totalOcc * 1.04));
                      
                      const getZoneStatus = (pct) => {
                        if (pct < 50) return { label: 'Clear', class: 'clear' };
                        if (pct < 80) return { label: 'Moderate', class: 'moderate' };
                        return { label: 'Congested', class: 'congested' };
                      };
                      
                      const leftStatus = getZoneStatus(leftVestibule);
                      const seatingStatus = getZoneStatus(seatingBay);
                      const rightStatus = getZoneStatus(rightVestibule);

                      return (
                        <div className="coach-ai-analytics">
                          <div className="ai-header">
                            <div className="ai-title">
                              <Camera size={18} style={{ color: 'hsl(var(--primary))' }} />
                              <h4>Live CCTV AI Analysis: Coach {coach.coach_id}</h4>
                            </div>
                            <span className="badge badge-low" style={{ textTransform: 'none' }}>
                              Jetson Unit: Node-TAMB-P{activeTrain.platform}-{coach.coach_id}
                            </span>
                          </div>
                          
                          <div className="ai-layout-grid">
                            {/* Left Section: Camera and AI Model Stats */}
                            <div className="ai-card-info">
                              <div className="ai-card-title">Surveillance Telemetry</div>
                              <div className="ai-metric-row">
                                <span className="ai-metric-label">Camera Status</span>
                                <span className={`ai-metric-value success`}>ONLINE (1080p @ 30fps)</span>
                              </div>
                              <div className="ai-metric-row">
                                <span className="ai-metric-label">AI Object Model</span>
                                <span className="ai-metric-value">YOLOv8-Crowd-v4.2</span>
                              </div>
                              <div className="ai-metric-row">
                                <span className="ai-metric-label">Inference Latency</span>
                                <span className="ai-metric-value success">11.8 ms</span>
                              </div>
                              <div className="ai-metric-row">
                                <span className="ai-metric-label">Passengers Onboard</span>
                                <span className="ai-metric-value">{coach.passenger_count} / {coach.is_first_class ? 50 : coach.is_differently_abled ? 30 : 100}</span>
                              </div>
                              <div className="ai-metric-row">
                                <span className="ai-metric-label">Luggage Density</span>
                                <span className="ai-metric-value">
                                  {coach.occupancy_percentage < 50 ? "Low" : coach.occupancy_percentage < 80 ? "Medium" : "High"}
                                </span>
                              </div>
                              <div className="ai-metric-row">
                                <span className="ai-metric-label">Flow Rate</span>
                                <span className="ai-metric-value">
                                  {coach.occupancy_percentage < 50 ? "+1 / sec" : coach.occupancy_percentage < 80 ? "+2 / sec" : "+4 / sec"}
                                </span>
                              </div>
                            </div>
                            
                            {/* Right Section: Zone-by-Zone Occupancy Levels */}
                            <div className="ai-zones-container">
                              <div className="ai-card-title" style={{ paddingLeft: '0.25rem' }}>Compartment Zone Crowd Density</div>
                              
                              {/* Left Vestibule */}
                              <div className="ai-zone-bar-wrapper">
                                <div className="ai-zone-info-row">
                                  <span className="ai-zone-label">Vestibule Area (Left Side)</span>
                                  <span className={`ai-zone-density-badge ${leftStatus.class}`}>{leftStatus.label} ({leftVestibule}%)</span>
                                </div>
                                <div className="ai-zone-progress-bg">
                                  <div className={`ai-zone-progress-fill ${leftStatus.class}`} style={{ width: `${leftVestibule}%` }}></div>
                                </div>
                              </div>
                              
                              {/* Seating Bay (Center) */}
                              <div className="ai-zone-bar-wrapper">
                                <div className="ai-zone-info-row">
                                  <span className="ai-zone-label">Seating Cabin (Center Bay)</span>
                                  <span className={`ai-zone-density-badge ${seatingStatus.class}`}>{seatingStatus.label} ({seatingBay}%)</span>
                                </div>
                                <div className="ai-zone-progress-bg">
                                  <div className={`ai-zone-progress-fill ${seatingStatus.class}`} style={{ width: `${seatingBay}%` }}></div>
                                </div>
                              </div>
                              
                              {/* Right Vestibule */}
                              <div className="ai-zone-bar-wrapper">
                                <div className="ai-zone-info-row">
                                  <span className="ai-zone-label">Vestibule Area (Right Side)</span>
                                  <span className={`ai-zone-density-badge ${rightStatus.class}`}>{rightStatus.label} ({rightVestibule}%)</span>
                                </div>
                                <div className="ai-zone-progress-bg">
                                  <div className={`ai-zone-progress-fill ${rightStatus.class}`} style={{ width: `${rightVestibule}%` }}></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Column */}
            <div className="admin-sidebar-col">
              {/* Live Alerts Widget */}
              <div className="sidebar-widget glass card-interactive animate-fade-in">
                <div className="widget-header">
                  <h3>Live Alerts</h3>
                  <span className="widget-badge">{activeAlerts.length}</span>
                </div>
                <div className="sidebar-alerts-list">
                  {activeAlerts.length > 0 ? activeAlerts.map((alert) => (
                    <div key={alert.id} className="sidebar-alert-item">
                      <div className="alert-icon-red">
                        <AlertTriangle size={18} />
                      </div>
                      <div className="alert-item-content">
                        <div className="alert-item-top">
                          <span className="alert-item-title">{alert.coach}</span>
                          <span className="alert-item-time">{alert.time}</span>
                        </div>
                        <span className="alert-item-desc">
                          {alert.desc}
                        </span>
                      </div>
                    </div>
                  )) : (
                    <div className="empty-track-info" style={{ textAlign: 'center', padding: '1rem' }}>
                      All systems nominal. No active alerts.
                    </div>
                  )}
                </div>
                <span className="widget-link-red">View All Alerts</span>
              </div>

              {/* Camera Status Donut Widget */}
              <div className="sidebar-widget glass card-interactive animate-fade-in">
                <div className="widget-header">
                  <h3>Camera Status</h3>
                  <span className="camera-ratio-text" style={{ color: onlineCameras === totalCameras ? 'hsl(var(--success))' : 'hsl(var(--warning))' }}>
                    {onlineCameras} / {totalCameras} Online
                  </span>
                </div>
                <div className="donut-chart-container">
                  <svg viewBox="0 0 36 36" className="circular-chart">
                    <path className="circle-bg"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path className="circle-fill-green"
                      strokeDasharray={`${cameraOnlinePercentage}, 100`}
                      style={{ stroke: onlineCameras === totalCameras ? 'hsl(var(--success))' : 'hsl(var(--warning))' }}
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="donut-legend">
                    <div className="donut-legend-item">
                      <span className="donut-dot green"></span> {onlineCameras} Online
                    </div>
                    <div className="donut-legend-item">
                      <span className="donut-dot red"></span> {totalCameras - onlineCameras} Offline
                    </div>
                  </div>
                </div>
                <span className="widget-link-blue">View Camera Grid</span>
              </div>

              {/* System Health Widget */}
              <div className="sidebar-widget glass card-interactive animate-fade-in">
                <div className="widget-header">
                  <h3>System Health</h3>
                </div>
                <div className="system-health-list">
                  <div className="health-row">
                    <div className="health-row-label">
                      <span className="donut-dot green"></span> Jetson Units
                    </div>
                    <span className="health-row-val">{onlineCameras}/{totalCameras} Online</span>
                  </div>
                  <div className="health-row">
                    <div className="health-row-label">
                      <span className="donut-dot green"></span> Server
                    </div>
                    <span className="health-row-val">Online</span>
                  </div>
                  <div className="health-row">
                    <div className="health-row-label">
                      <span className="donut-dot green"></span> Database
                    </div>
                    <span className="health-row-val">Healthy</span>
                  </div>
                  <div className="health-row">
                    <div className="health-row-label">
                      <span className="donut-dot green"></span> Network
                    </div>
                    <span className="health-row-val">Stable</span>
                  </div>
                </div>
                <span className="widget-link-blue">View System Details</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer-bar">
        <span>© 2026 Southern Railways - RailVision AI Division</span>
        <span>Developer Console | Edge CCTV Nodes: 66/66 Online</span>
      </footer>
    </div>
  );
}

export default App;
