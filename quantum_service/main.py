from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
try:
    from .engine import QuantumWeatherEngine
except ImportError:
    from engine import QuantumWeatherEngine
import uvicorn
import os

app = FastAPI(title="Quantum Weather Intelligence")

# Initialize Quantum Engine
q_engine = QuantumWeatherEngine()

class WeatherInput(BaseModel):
    temperature: float
    humidity: float
    pressure: float
    wind: float
    clouds: float
    rain: float

@app.get("/")
def read_root():
    return {"status": "Quantum Core Online", "system": "Qiskit Aer"}

@app.post("/quantum/analyze")
async def analyze_weather(data: WeatherInput):
    try:
        # Convert pydantic model to dict
        weather_dict = data.dict()
        
        # Run Quantum Simulation
        result = q_engine.analyze(weather_dict)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
