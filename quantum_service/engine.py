import numpy as np
import math

try:
    from .neural_net import NeuralErrorCorrector
except ImportError:
    from neural_net import NeuralErrorCorrector

class NanoQuantumCircuit:
    def __init__(self, n_qubits=5):
        self.n = n_qubits
        # Initialize state |00000> -> all zeros except index 0=1.
        # Shape: (2, 2, 2, 2, 2). Axis 0=Q4 (MSB), Axis 4=Q0 (LSB).
        self.state = np.zeros((2,) * self.n, dtype=complex)
        self.state[(0,) * self.n] = 1.0

    def _target_axis(self, wire):
        # Map wire index (0=LSB) to numpy axis (last axis is LSB)
        return self.n - 1 - wire

    def h(self, wire):
        axis = self._target_axis(wire)
        gate = np.array([[1, 1], [1, -1]]) / math.sqrt(2)
        # Apply gate
        self.state = np.tensordot(gate, self.state, axes=(1, axis))
        self.state = np.moveaxis(self.state, 0, axis)

    def rx(self, theta, wire):
        axis = self._target_axis(wire)
        gate = np.array([[math.cos(theta/2), -1j * math.sin(theta/2)],
                         [-1j * math.sin(theta/2), math.cos(theta/2)]])
        self.state = np.tensordot(gate, self.state, axes=(1, axis))
        self.state = np.moveaxis(self.state, 0, axis)

    def ry(self, theta, wire):
        axis = self._target_axis(wire)
        gate = np.array([[math.cos(theta/2), -math.sin(theta/2)],
                         [math.sin(theta/2), math.cos(theta/2)]])
        self.state = np.tensordot(gate, self.state, axes=(1, axis))
        self.state = np.moveaxis(self.state, 0, axis)

    def rz(self, theta, wire):
        axis = self._target_axis(wire)
        gate = np.array([[math.exp(-1j*theta/2), 0],
                         [0, math.exp(1j*theta/2)]])
        self.state = np.tensordot(gate, self.state, axes=(1, axis))
        self.state = np.moveaxis(self.state, 0, axis)

    def p(self, theta, wire):
        axis = self._target_axis(wire)
        gate = np.array([[1, 0], 
                         [0, math.exp(1j*theta)]])
        self.state = np.tensordot(gate, self.state, axes=(1, axis))
        self.state = np.moveaxis(self.state, 0, axis)

    def cx(self, control, target):
        c_axis = self._target_axis(control)
        t_axis = self._target_axis(target)
        
        idx0 = [slice(None)] * self.n
        idx1 = [slice(None)] * self.n
        
        idx0[c_axis] = 1 
        idx0[t_axis] = 0 
        
        idx1[c_axis] = 1 
        idx1[t_axis] = 1
        
        temp = self.state[tuple(idx0)].copy()
        self.state[tuple(idx0)] = self.state[tuple(idx1)]
        self.state[tuple(idx1)] = temp

    def cry(self, theta, control, target):
        c_axis = self._target_axis(control)
        t_axis = self._target_axis(target)
        self.state = np.moveaxis(self.state, c_axis, 0)
        gate = np.array([[math.cos(theta/2), -math.sin(theta/2)],
                         [math.sin(theta/2), math.cos(theta/2)]])
        eff_t_axis = t_axis if t_axis < c_axis else t_axis - 1
        substate = self.state[1]
        new_sub = np.tensordot(gate, substate, axes=(1, eff_t_axis))
        new_sub = np.moveaxis(new_sub, 0, eff_t_axis)
        self.state[1] = new_sub
        self.state = np.moveaxis(self.state, 0, c_axis)


    def probabilities(self):
        return np.abs(self.state.flatten())**2

class QuantumWeatherEngine:
    def __init__(self):
        self.n_qubits = 5
        self.neural_corrector = NeuralErrorCorrector()
        
    def normalize_param(self, value, min_val, max_val):
        norm = (value - min_val) / (max_val - min_val)
        return max(0.0, min(1.0, norm))

    def analyze(self, weather_data):
        qc = NanoQuantumCircuit(self.n_qubits)
        
        theta_temp = self.normalize_param(weather_data.get('temperature', 20), -20, 50) * math.pi
        theta_hum = self.normalize_param(weather_data.get('humidity', 50), 0, 100) * math.pi
        theta_press = self.normalize_param(weather_data.get('pressure', 1013), 900, 1100) * math.pi
        theta_wind = self.normalize_param(weather_data.get('wind', 0), 0, 100) * math.pi
        theta_clouds = self.normalize_param(weather_data.get('clouds', 0), 0, 100) * (math.pi / 2)

        for i in range(5):
            qc.h(i)
            
        qc.rx(theta_temp, 0)
        qc.ry(theta_hum, 1)
        qc.rz(theta_press, 2)
        qc.p(theta_wind, 3)
        qc.cry(theta_clouds, 3, 4)
        
        qc.cx(0, 1)
        qc.cx(2, 3)
        qc.cx(1, 2)
        qc.cx(3, 4)
        qc.cx(4, 0)
        
        probs = qc.probabilities()
        
        storm_prob = sum(p for i, p in enumerate(probs) if bin(i).count('1') >= 3)
        rain_confidence = sum(p for i, p in enumerate(probs) if (i & 3) == 3) * 2.5
        chaos_index = 1.0 - max(probs)
        raw_reliability = max(0.1, 1.0 - chaos_index)
        
        correction_factor = self.neural_corrector.predict_correction(probs)
        final_reliability = min(1.0, raw_reliability * correction_factor)
        
        top_indices = np.argsort(probs)[-3:][::-1]
        top_states = []
        
        state_meanings = {
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
            adjusted_prob = float(probs[idx]) * correction_factor
            top_states.append({
                "state": f"|{b_state}⟩",
                "probability": round(min(99.9, adjusted_prob * 100), 1),
                "meaning": generate_desc(b_state)
            })

        dominant_state = f"{top_indices[0]:05b}"
        insight_msg = generate_desc(dominant_state)
        
        volatility = 1.0 - max(probs)
        
        dangerous_momentum = sum(s['probability'] for s in top_states if s['state'] in ['|11011⟩', '|10101⟩', '|11111⟩']) / 100.0
        cyclone_risk_states = sum(p for i, p in enumerate(probs) if (i & 12) == 4) 
        cyclone_index = (storm_prob * 0.3) + (dangerous_momentum * 0.5) + (cyclone_risk_states * 1.5)
        
        flood_risk_prob = sum(p for i, p in enumerate(probs) if (i & 22) == 18) 
        flood_risk = (rain_confidence * 0.3) + (flood_risk_prob * 2.5)
        
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
