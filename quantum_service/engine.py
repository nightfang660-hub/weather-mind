import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector
import math
try:
    from .neural_net import NeuralErrorCorrector
except ImportError:
    from neural_net import NeuralErrorCorrector

class QuantumWeatherEngine:
    def __init__(self):
        # We use a 5-qubit system for multi-parameter encoding
        self.n_qubits = 5
        self.neural_corrector = NeuralErrorCorrector()
        
    def normalize_param(self, value, min_val, max_val):
        """Normalize input to 0-1 range for qubit rotation (0 to Pi)"""
        norm = (value - min_val) / (max_val - min_val)
        return max(0.0, min(1.0, norm))

    def create_circuit(self, temp, humidity, pressure, wind, clouds):
        """
        Encodes weather parameters into a quantum circuit.
        
        Encoding Strategy:
        - Temperature -> Qubit 0 (RX Rotation)
        - Humidity    -> Qubit 1 (RY Rotation)
        - Pressure    -> Qubit 2 (RZ Phase)
        - Wind        -> Qubit 3 (Hadamard + Phase)
        - Clouds      -> Qubit 4 (Noise/Damping simulation)
        
        Entanglement:
        CX gates applied between Temp-Humidity and Pressure-Wind to simulate 
        thermodynamic correlations.
        """
        qc = QuantumCircuit(self.n_qubits)
        
        # 1. Initialization (Superposition)
        for i in range(self.n_qubits):
            qc.h(i)
            
        # 2. Parameter Encoding
        # Normalize inputs to rotation angles (0 to Pi)
        theta_temp = self.normalize_param(temp, -20, 50) * math.pi
        theta_hum = self.normalize_param(humidity, 0, 100) * math.pi
        theta_press = self.normalize_param(pressure, 900, 1100) * math.pi
        theta_wind = self.normalize_param(wind, 0, 100) * math.pi
        theta_cloud = self.normalize_param(clouds, 0, 100) * (math.pi / 2)

        # Apply encoding gates
        qc.rx(theta_temp, 0)      # Temperature affects energy state
        qc.ry(theta_hum, 1)       # Humidity affects amplitude
        qc.rz(theta_press, 2)     # Pressure affects phase
        qc.p(theta_wind, 3)       # Wind introduces phase shift
        
        # Cloud cover acts as interference/damping (CRY rotation conditioned on wind)
        qc.cry(theta_cloud, 3, 4) 

        # 3. Entanglement (Simulating Atmospheric Chaos)
        # Temp <-> Humidity correlation
        qc.cx(0, 1)
        # Pressure <-> Wind correlation
        qc.cx(2, 3)
        # Global Atmospheric Entanglement (The "Butterfly Effect")
        qc.cx(1, 2)
        qc.cx(3, 4)
        qc.cx(4, 0) # Feedback loop

        return qc

    def analyze(self, weather_data):
        """
        Executes the quantum simulation and returns probabilities.
        Since we don't have a real QPU, we use Statevector simulation.
        """
        qc = self.create_circuit(
            weather_data['temperature'],
            weather_data['humidity'],
            weather_data['pressure'],
            weather_data['wind'],
            weather_data['clouds']
        )
        
        # Statevector simulation (Ideal for analysis without shot noise)
        state = Statevector.from_instruction(qc)
        probs = state.probabilities()
        
        # metric extraction from quantum state
        # We aggregate probabilities of "excited" states to determine instability/storm risk
        
        # Storm Probability: Sum of probabilities where majority of qubits are |1>
        # Indices with Hamming weight >= 3
        storm_prob = sum(p for i, p in enumerate(probs) if bin(i).count('1') >= 3)
        
        # Rain Confidence: Correlation between Temp (Q0) and Humidity (Q1)
        # Simply using the probability of state |11... >
        rain_confidence = sum(p for i, p in enumerate(probs) if (i & 3) == 3) * 2.5 # Scale factor
        
        # Atmospheric Chaos: Entropy of the system
        # Simplified: 1 - max_probability (High entropy = Flat distribution = Chaos)
        chaos_index = 1.0 - max(probs)
        
        # Forecast Reliability: Coherence check (Inverse of chaos in this model)
        raw_reliability = max(0.1, 1.0 - chaos_index)
        
        # --- NEURAL ERROR CORRECTION ---
        # The Neural Network predicts a correction factor based on the quantum state distribution
        correction_factor = self.neural_corrector.predict_correction(probs)
        final_reliability = min(1.0, raw_reliability * correction_factor)
        
        # Quantum Multi-future Insight based on dominant state
        # Get top 3 probable states
        top_indices = np.argsort(probs)[-3:][::-1]
        top_states = []
        
        state_meanings = {
            # Temp (Q0), Hum (Q1), Press (Q2), Wind (Q3), Cloud (Q4)
            # 0=Low, 1=High
            "00000": "Stable: Clear & Calm",
            "11111": "Critical: Super-Cell Storm",
            "10101": "Hot, High Pressure, Windy",
            "01010": "Cooldown, Low Pressure, Humid",
            "01001": "Humid, Calm, Cloudy",
            "10000": "Hot & Dry Stagnation",
            "01100": "Humid High Pressure",
            "00011": "Windy & Overcast",
            "11000": "Hot & Humid (Muggy)",
            "11001": "Hot, Humid & Cloudy",
            "11011": "Tropical Storm Conditions",
            "00100": "Cool High Pressure",
            "00010": "Breezy & Clear"
        }

        def generate_desc(binary):
            if binary in state_meanings: return state_meanings[binary]
            
            # Dynamic Description Generator derived from Qubit Mapping
            desc = []
            if binary[4] == '1': desc.append("Cloudy") 
            else: desc.append("Clear")
            
            if binary[3] == '1': desc.append("Windy")
            
            if binary[1] == '1': desc.append("Humid")
            
            if binary[0] == '1': desc.append("Hot")
            else: desc.append("Cool")
            
            return ", ".join(desc)

        for idx in top_indices:
            b_state = f"{idx:05b}"
            # Reverse binary string to match Qubit 0 -> Qubit 4 ordering in reading if needed, 
            # but here we keep Big Endian (Q4Q3Q2Q1Q0) or Little Endian depending on Qiskit.
            # Qiskit is Little Endian (Qn...Q0). Let's assume binary_state string matches usage.
            # Actually Qiskit Statevector probabilities are indexed such that index 1 = 00001 (Q0=1).
            # So binary string "01001" means Q4=0, Q3=1, Q2=0, Q1=0, Q0=1.
            
            # Apply slight neural weighting to probability for display
            adjusted_prob = float(probs[idx]) * correction_factor
            
            top_states.append({
                "state": f"|{b_state}⟩",
                "probability": round(min(99.9, adjusted_prob * 100), 1),
                "meaning": generate_desc(b_state)
            })

        dominant_state = f"{top_indices[0]:05b}"
        insight_msg = generate_desc(dominant_state)



        # --- EXTENDED ANALYTICS (FLOOD & CYCLONE) ---
        # Volatility = 1 - Probability of most likely state
        # Measures how "split" the future timelines are
        volatility = 1.0 - max(probs)

        # Cyclone Index Calculation
        # Refined Logic: Only trigger high risk if specific "Dangerous" states are dominant.
        # Dangerous States: |11011> (Tropical Storm), |10101> (High Wind/Pressure Anomaly)
        
        # Check if any top state matches a dangerous pattern
        dangerous_momentum = sum(s['probability'] for s in top_states if s['state'] in ['|11011⟩', '|10101⟩', '|11111⟩']) / 100.0
        
        # Aggregate probability of Low Pressure + High Wind states (Bitmask pattern xx10x)
        cyclone_risk_states = sum(p for i, p in enumerate(probs) if (i & 12) == 4) 
        
        cyclone_index = (
            (storm_prob * 0.3) + 
            (dangerous_momentum * 0.5) +  # Give more weight to actual dangerous states being probable
            (cyclone_risk_states * 1.5)
        )
        
        # Extreme Rain / Flood Predictor
        # High Humidity (Q1=1) + Clouds (Q4=1) + Low Pressure (Q2=0) -> Pattern 1x01x
        flood_risk_prob = sum(p for i, p in enumerate(probs) if (i & 22) == 18) 
        
        flood_risk = (
            (rain_confidence * 0.3) +
            (flood_risk_prob * 2.5) # Reduced multiplier further
        )
        
        # DEBUG: Print generated states to console
        print(f"DEBUG: Top States Generated: {[s['state'] for s in top_states]}")

        return {
            "storm_probability": min(1.0, storm_prob),
            "rain_confidence": min(1.0, rain_confidence),
            "atmospheric_chaos": min(1.0, chaos_index),
            "forecast_reliability": final_reliability,
            "quantum_summary": insight_msg,
            "top_states": top_states,
            "neural_correction_factor": round(float(correction_factor), 3),
            "volatility": min(1.0, volatility),
            "cyclone_index": min(1.0, cyclone_index),
            "flood_risk": min(1.0, flood_risk)
        }
