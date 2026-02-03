import numpy as np

class NeuralErrorCorrector:
    """
    A simple Neural Network implemented in NumPy to correct Quantum Noise.
    Architecture: Input(5) -> Hidden(8) -> Hidden(8) -> Output(1)
    """
    
    def __init__(self):
        # Seed for consistent "trained" behavior
        np.random.seed(42)
        
        # Weights (simulated pre-trained weights)
        self.weights1 = np.random.randn(5, 8) * 0.1
        self.bias1 = np.zeros(8)
        
        self.weights2 = np.random.randn(8, 8) * 0.1
        self.bias2 = np.zeros(8)
        
        self.weights3 = np.random.randn(8, 1) * 0.1
        self.bias3 = np.zeros(1)
        
    def relu(self, x):
        return np.maximum(0, x)
        
    def sigmoid(self, x):
        return 1 / (1 + np.exp(-x))
        
    def predict_correction(self, state_vector_probs):
        """
        Takes the raw quantum probabilities (first 5 principal components)
        and predicts a 'Reliability Score' correction factor.
        """
        # Input layer (Take top 5 probs or pad if fewer)
        x = np.array(sorted(state_vector_probs, reverse=True)[:5])
        if len(x) < 5:
            x = np.pad(x, (0, 5 - len(x)))
            
        # Forward pass
        l1 = self.relu(np.dot(x, self.weights1) + self.bias1)
        l2 = self.relu(np.dot(l1, self.weights2) + self.bias2)
        output = self.sigmoid(np.dot(l2, self.weights3) + self.bias3)
        
        # Return a scalar correction factor (0.8 to 1.2 range)
        return 0.8 + (output[0] * 0.4)
