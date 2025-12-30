#!/bin/bash
# Quick start script for Songo RL training

echo "========================================="
echo "SONGO RL - QUICK START"
echo "========================================="
echo ""

# Check Python
if ! command -v python &> /dev/null; then
    echo "❌ Python not found. Please install Python 3.8+"
    exit 1
fi

echo "✓ Python found: $(python --version)"

# Install dependencies
echo ""
echo "[1/4] Installing dependencies..."
pip install -q -r requirements.txt
echo "✓ Dependencies installed"

# Test environment
echo ""
echo "[2/4] Testing environment..."
python -c "from songo_env import SongoEnv; env = SongoEnv(); print('✓ Environment OK')"

# Test network
echo ""
echo "[3/4] Testing network..."
python -c "from songo_net import SongoNetSmall; import torch; net = SongoNetSmall(); print('✓ Network OK')"

# Run quick training
echo ""
echo "[4/4] Starting quick training (10 iterations, ~10 minutes)..."
echo "    This will train a small model to verify everything works."
echo "    For full training, use: python train.py (see README.md)"
echo ""

python train.py \
  --network-size small \
  --hidden-size 128 \
  --num-iterations 10 \
  --games-per-iteration 10 \
  --mcts-simulations 50 \
  --eval-frequency 5 \
  --eval-games 10 \
  --checkpoint-frequency 5

echo ""
echo "========================================="
echo "QUICK START COMPLETED!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Check checkpoints/songo_latest.pt"
echo "  2. For full training: python train.py --num-iterations 100"
echo "  3. Export model: python export_model.py --checkpoint checkpoints/songo_latest.pt"
echo ""
