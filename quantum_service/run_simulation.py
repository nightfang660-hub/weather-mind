import random
import numpy as np
import time
from engine import QuantumWeatherEngine

# --- Configuration ---
NUM_TESTS = 523
SEED = 42

class WeatherSimulator:
    def __init__(self):
        self.engine = QuantumWeatherEngine()
        random.seed(SEED)
        np.random.seed(SEED)

    def generate_weather_event(self, is_severe):
        """Generates synthetic weather data.
        if is_severe=True, generates parameters likely to cause a storm (Low Press, High Wind/Hum).
        if is_severe=False, generates calm/stable parameters.
        """
        if is_severe:
            # Extreme/Stormy Conditions
            return {
                'temperature': random.uniform(25, 45),     # Hot, energy for storm
                'humidity': random.uniform(70, 100),       # High saturation
                'pressure': random.uniform(920, 990),      # Low pressure (Storm center)
                'wind': random.uniform(60, 150),           # High wind
                'clouds': random.uniform(80, 100)          # Overcast
            }
        else:
            # Normal/Calm Conditions
            if random.random() > 0.5:
                # Clear Day
                return {
                    'temperature': random.uniform(10, 30),
                    'humidity': random.uniform(20, 60),
                    'pressure': random.uniform(1010, 1035), # High pressure
                    'wind': random.uniform(0, 25),
                    'clouds': random.uniform(0, 30)
                }
            else:
                # Cloudy but valid day
                return {
                    'temperature': random.uniform(15, 35),
                    'humidity': random.uniform(40, 75),
                    'pressure': random.uniform(1005, 1020),
                    'wind': random.uniform(10, 40),
                    'clouds': random.uniform(40, 80)
                }

    def run(self):
        print(f"Initializing Quantum Weather Simulation...")
        print(f"Goal: Validation of {NUM_TESTS} scenarios against Ground Truth.")
        print("-" * 100)
        print(f"{'ID':<4} | {'Condition':<12} | {'Temp':<5} | {'Press':<6} | {'Wind':<5} | {'Chaos':<5} | {'Risk':<5} | {'Prediction':<10} | {'Match?'}")
        print("-" * 100)

        start_time = time.time()
        
        # Metrics trackers
        true_positives = 0
        true_negatives = 0
        false_positives = 0
        false_negatives = 0
        
        # Generate a dataset with ~20% severe weather events (realistic imbalance)
        dataset = []
        for i in range(NUM_TESTS):
            is_severe = random.random() < 0.22  # 22% chance of storm
            data = self.generate_weather_event(is_severe)
            dataset.append((is_severe, data))

        rec_count = 0
        
        for i, (is_actual_severe, weather) in enumerate(dataset):
            # 1. Run Quantum Analysis
            # We add slight noise to simulation to test robustness
            simulation_input = weather.copy()
            # Add small random noise to mimic sensor error
            simulation_input['wind'] += random.uniform(-2, 2)
            
            result = self.engine.analyze(simulation_input)
            
            # 2. Determine Quantum Prediction
            # OBSERVED PATTERN:
            # Severe Weather (High Energy inputs) drives system to defined states (Low Entropy/Chaos).
            # Calm Weather (Mid-range inputs) keeps system in Superposition (High Entropy/Chaos).
            # Threshold: Chaos < 0.45 implies Severe Event.

            q_chaos = result['atmospheric_chaos']
            q_prob = result['storm_probability']
            predicted_severe = (q_chaos < 0.40)
            
            # 3. Compare with Ground Truth
            if is_actual_severe and predicted_severe:
                true_positives += 1
                match = "✅"
            elif not is_actual_severe and not predicted_severe:
                true_negatives += 1
                match = "✅"
            elif not is_actual_severe and predicted_severe:
                false_positives += 1
                match = "❌ (FP)"
            elif is_actual_severe and not predicted_severe:
                false_negatives += 1
                match = "❌ (FN)"
            
            # Print row (sample every 20th for brevity)
            if i % 20 == 0 or not match == "✅":
                lbl = "SEVERE" if is_actual_severe else "CALM"
                pred_lbl = "SEVERE" if predicted_severe else "CALM"
                print(f"{i:<4} | {lbl:<12} | {weather['temperature']:>5.1f} | {weather['pressure']:>6.1f} | {weather['wind']:>5.1f} | {q_chaos:>5.2f} | {q_prob:>5.2f} | {pred_lbl:<10} | {match}")
                rec_count += 1

        end_time = time.time()
        
        # --- Final Statistics ---
        total = NUM_TESTS
        correct = true_positives + true_negatives
        accuracy = correct / total
        
        precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0
        recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        print("-" * 100)
        print("SIMULATION RESULTS SUMMARY")
        print(f"Total Test Cases: {NUM_TESTS}")
        print(f"Execution Time:   {end_time - start_time:.4f}s")
        print("\nCONFUSION MATRIX:")
        print(f"True Positives (Hit):      {true_positives}")
        print(f"True Negatives (Rejection):{true_negatives}")
        print(f"False Positives (Alarm):   {false_positives}")
        print(f"False Negatives (Miss):    {false_negatives}")
        print("-" * 100)
        print(f"ACCURACY:  {accuracy*100:.2f}% (Target: >90%)")
        print(f"PRECISION: {precision:.3f}")
        print(f"RECALL:    {recall:.3f}")
        print(f"F1-SCORE:  {f1:.3f}")
        print("-" * 100)

if __name__ == "__main__":
    sim = WeatherSimulator()
    sim.run()
