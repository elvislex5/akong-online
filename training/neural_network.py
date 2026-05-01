"""
AlphaZero for Songo — Neural Network Architecture (PyTorch)

Dual-headed ResNet:
- Policy Head: probability distribution over 7 actions
- Value Head: scalar in [-1, 1] estimating win probability
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
from config import NetworkConfig


class ResidualBlock(nn.Module):
    """Residual block with two FC layers + skip connection."""

    def __init__(self, hidden_size: int, dropout: float = 0.1):
        super().__init__()
        self.fc1 = nn.Linear(hidden_size, hidden_size)
        self.bn1 = nn.BatchNorm1d(hidden_size)
        self.fc2 = nn.Linear(hidden_size, hidden_size)
        self.bn2 = nn.BatchNorm1d(hidden_size)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = x
        x = F.relu(self.bn1(self.fc1(x)))
        x = self.dropout(x)
        x = self.bn2(self.fc2(x))
        x = x + residual  # Skip connection
        x = F.relu(x)
        return x


class SongoNet(nn.Module):
    """
    Neural network for Songo with AlphaZero architecture.

    Input:  (batch, 80) — encoded game state (base + zone + Maison + capture + vulnerability + book features)
    Output: policy (batch, 7) — log probabilities over actions
            value  (batch, 1) — win probability estimate [-1, 1]
    """

    def __init__(self, config: NetworkConfig = None):
        super().__init__()
        config = config or NetworkConfig()
        
        self.config = config

        # Input projection
        self.input_fc = nn.Linear(config.input_size, config.hidden_size)
        self.input_bn = nn.BatchNorm1d(config.hidden_size)

        # Residual tower
        self.res_blocks = nn.ModuleList([
            ResidualBlock(config.hidden_size, config.dropout)
            for _ in range(config.num_res_blocks)
        ])

        # Policy head
        self.policy_fc1 = nn.Linear(config.hidden_size, 64)
        self.policy_bn = nn.BatchNorm1d(64)
        self.policy_fc2 = nn.Linear(64, config.policy_size)

        # Value head
        self.value_fc1 = nn.Linear(config.hidden_size, 64)
        self.value_bn = nn.BatchNorm1d(64)
        self.value_fc2 = nn.Linear(64, 1)

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        """
        Forward pass.
        Args:
            x: (batch, 80) encoded state
        Returns:
            policy: (batch, 7) log-probabilities (use with F.softmax for probs)
            value:  (batch, 1) value estimate in [-1, 1]
        """
        # Input projection
        x = F.relu(self.input_bn(self.input_fc(x)))

        # Residual tower
        for block in self.res_blocks:
            x = block(x)

        # Policy head
        policy = F.relu(self.policy_bn(self.policy_fc1(x)))
        policy = self.policy_fc2(policy)  # Raw logits (log_softmax applied during loss)

        # Value head
        value = F.relu(self.value_bn(self.value_fc1(x)))
        value = torch.tanh(self.value_fc2(value))

        return policy, value

    def predict(self, state: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        """
        Predict policy probabilities and value for a single state.
        
        Args:
            state: (32,) or (1, 32) tensor
        Returns:
            policy_probs: (7,) probability distribution
            value: scalar value
        """
        self.eval()
        with torch.no_grad():
            if state.dim() == 1:
                state = state.unsqueeze(0)
            
            policy_logits, value = self(state)
            policy_probs = F.softmax(policy_logits, dim=1).squeeze(0)
            value = value.squeeze()
        
        return policy_probs, value

    def count_parameters(self) -> int:
        """Count total trainable parameters."""
        return sum(p.numel() for p in self.parameters() if p.requires_grad)


def create_network(config: NetworkConfig = None, device: str = "cpu") -> SongoNet:
    """Create and initialize the network."""
    model = SongoNet(config)
    model = model.to(device)
    print(f"[Network] Created SongoNet with {model.count_parameters():,} parameters")
    print(f"[Network] Device: {device}")
    return model


if __name__ == "__main__":
    # Quick test
    config = NetworkConfig()
    model = create_network(config)
    
    # Test forward pass
    batch = torch.randn(8, config.input_size)
    policy, value = model(batch)
    print(f"Policy shape: {policy.shape}")  # (8, 7)
    print(f"Value shape: {value.shape}")    # (8, 1)
    
    # Test prediction
    single_state = torch.randn(config.input_size)
    probs, val = model.predict(single_state)
    print(f"Probs: {probs} (sum={probs.sum():.4f})")
    print(f"Value: {val:.4f}")
