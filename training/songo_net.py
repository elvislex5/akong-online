"""
Neural Network for Songo - AlphaZero style
Policy + Value dual-head architecture
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np

class SongoNet(nn.Module):
    """
    Neural network for Songo game
    Input: 17 features (board + scores + current_player)
    Output: Policy (14 move probabilities) + Value (win probability)
    """

    def __init__(self, hidden_size=256):
        super(SongoNet, self).__init__()

        self.input_size = 17
        self.action_size = 14
        self.hidden_size = hidden_size

        # Shared layers
        self.fc1 = nn.Linear(self.input_size, hidden_size)
        self.bn1 = nn.BatchNorm1d(hidden_size)

        self.fc2 = nn.Linear(hidden_size, hidden_size)
        self.bn2 = nn.BatchNorm1d(hidden_size)

        self.fc3 = nn.Linear(hidden_size, hidden_size)
        self.bn3 = nn.BatchNorm1d(hidden_size)

        # Policy head (which move to play)
        self.policy_fc1 = nn.Linear(hidden_size, hidden_size // 2)
        self.policy_fc2 = nn.Linear(hidden_size // 2, self.action_size)

        # Value head (who will win)
        self.value_fc1 = nn.Linear(hidden_size, hidden_size // 4)
        self.value_fc2 = nn.Linear(hidden_size // 4, 1)

    def forward(self, x):
        """
        Forward pass
        Returns: (policy_logits, value)
        """
        # Shared layers with residual connections
        x1 = F.relu(self.bn1(self.fc1(x)))
        x2 = F.relu(self.bn2(self.fc2(x1)))
        x3 = F.relu(self.bn3(self.fc3(x2))) + x1  # Residual connection

        # Policy head
        policy = F.relu(self.policy_fc1(x3))
        policy_logits = self.policy_fc2(policy)

        # Value head
        value = F.relu(self.value_fc1(x3))
        value = torch.tanh(self.value_fc2(value))  # Value in [-1, 1]

        return policy_logits, value

    def predict(self, state_features):
        """
        Predict policy and value for a single state
        Args:
            state_features: numpy array of shape (17,)
        Returns:
            policy: numpy array of shape (14,) - probabilities
            value: float in [-1, 1]
        """
        self.eval()
        with torch.no_grad():
            device = next(self.parameters()).device
            x = torch.as_tensor(state_features, dtype=torch.float32, device=device).unsqueeze(0)
            policy_logits, value = self.forward(x)
            policy = F.softmax(policy_logits, dim=1).squeeze(0).detach().cpu().numpy()
            value = value.item()

        return policy, value

    def predict_batch(self, state_features_batch):
        """
        Predict for a batch of states
        Args:
            state_features_batch: numpy array of shape (batch_size, 17)
        Returns:
            policies: numpy array of shape (batch_size, 14)
            values: numpy array of shape (batch_size,)
        """
        self.eval()
        with torch.no_grad():
            device = next(self.parameters()).device
            x = torch.as_tensor(state_features_batch, dtype=torch.float32, device=device)
            policy_logits, values = self.forward(x)
            policies = F.softmax(policy_logits, dim=1).detach().cpu().numpy()
            values = values.squeeze(1).detach().cpu().numpy()

        return policies, values


class SongoNetSmall(nn.Module):
    """
    Smaller, faster network for quick training/testing
    """

    def __init__(self, hidden_size=128):
        super(SongoNetSmall, self).__init__()

        self.input_size = 17
        self.action_size = 14

        # Shared layers (simpler)
        self.fc1 = nn.Linear(self.input_size, hidden_size)
        self.fc2 = nn.Linear(hidden_size, hidden_size)

        # Policy head
        self.policy_fc = nn.Linear(hidden_size, self.action_size)

        # Value head
        self.value_fc = nn.Linear(hidden_size, 1)

    def forward(self, x):
        x = F.relu(self.fc1(x))
        x = F.relu(self.fc2(x))

        policy_logits = self.policy_fc(x)
        value = torch.tanh(self.value_fc(x))

        return policy_logits, value

    def predict(self, state_features):
        """Single state prediction"""
        self.eval()
        with torch.no_grad():
            device = next(self.parameters()).device
            x = torch.as_tensor(state_features, dtype=torch.float32, device=device).unsqueeze(0)
            policy_logits, value = self.forward(x)
            policy = F.softmax(policy_logits, dim=1).squeeze(0).detach().cpu().numpy()
            value = value.item()
        
        return policy, value


def train_step(model, optimizer, states, policies_target, values_target):
    """
    Single training step
    Args:
        model: SongoNet
        optimizer: torch optimizer
        states: tensor (batch_size, 17)
        policies_target: tensor (batch_size, 14) - MCTS visit counts
        values_target: tensor (batch_size,) - game outcomes
    Returns:
        total_loss, policy_loss, value_loss
    """
    model.train()
    optimizer.zero_grad()

    policy_logits, values = model(states)

    # Policy loss (cross-entropy with MCTS policy)
    policy_loss = -torch.mean(torch.sum(policies_target * F.log_softmax(policy_logits, dim=1), dim=1))

    # Value loss (MSE with game outcome)
    value_loss = F.mse_loss(values.squeeze(1), values_target)

    # Total loss
    total_loss = policy_loss + value_loss

    total_loss.backward()
    optimizer.step()

    return total_loss.item(), policy_loss.item(), value_loss.item()


def save_checkpoint(model, optimizer, epoch, filename):
    """Save model checkpoint"""
    checkpoint = {
        'epoch': epoch,
        'model_state_dict': model.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
    }
    torch.save(checkpoint, filename)
    print(f"Checkpoint saved: {filename}")


def load_checkpoint(model, optimizer, filename):
    """Load model checkpoint"""
    map_location = next(model.parameters()).device
    checkpoint = torch.load(filename, map_location=map_location)
    model.load_state_dict(checkpoint['model_state_dict'])
    if optimizer is not None:
        optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
    epoch = checkpoint['epoch']
    print(f"Checkpoint loaded: {filename} (epoch {epoch})")
    return epoch


if __name__ == "__main__":
    # Test the network
    print("Testing SongoNet...")

    model = SongoNet(hidden_size=256)
    print(f"Model parameters: {sum(p.numel() for p in model.parameters()):,}")

    # Test forward pass
    batch_size = 32
    dummy_input = torch.randn(batch_size, 17)

    policy_logits, values = model(dummy_input)
    print(f"Policy logits shape: {policy_logits.shape}")  # (32, 14)
    print(f"Values shape: {values.shape}")  # (32, 1)

    # Test single prediction
    state_features = np.random.randn(17).astype(np.float32)
    policy, value = model.predict(state_features)
    print(f"\nSingle prediction:")
    print(f"Policy shape: {policy.shape}, sum: {policy.sum():.3f}")
    print(f"Value: {value:.3f}")

    # Test small model
    print("\n" + "="*50)
    print("Testing SongoNetSmall...")
    small_model = SongoNetSmall(hidden_size=128)
    print(f"Small model parameters: {sum(p.numel() for p in small_model.parameters()):,}")

    policy_logits, values = small_model(dummy_input)
    print(f"Policy logits shape: {policy_logits.shape}")
    print(f"Values shape: {values.shape}")

    print("\n✓ Network tests passed!")
