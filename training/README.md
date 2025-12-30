# Songo RL Training

Reinforcement Learning training system for Songo game using AlphaZero-style self-play.

## Architecture

```
songo_env.py       # Game environment (port from TypeScript)
songo_net.py       # Neural network (Policy + Value heads)
mcts.py            # Monte Carlo Tree Search
self_play.py       # Self-play engine
train.py           # Training script
```

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Quick Test (Small Network, Fast)

```bash
python train.py \
  --network-size small \
  --hidden-size 128 \
  --num-iterations 10 \
  --games-per-iteration 20 \
  --mcts-simulations 50 \
  --eval-frequency 5
```

**Expected time:** ~10-15 minutes on CPU

### 3. Full Training (Strong Network)

```bash
python train.py \
  --network-size standard \
  --hidden-size 256 \
  --num-iterations 100 \
  --games-per-iteration 50 \
  --mcts-simulations 100 \
  --eval-frequency 10
```

**Expected time:** ~6-12 hours on CPU (can run in background)

### 4. Resume Training

```bash
python train.py --resume-from checkpoints/songo_latest.pt
```

## Configuration Options

### Network
- `--network-size`: `small` (128 params, fast) or `standard` (256 params, strong)
- `--hidden-size`: Hidden layer size (default: 256)

### Training
- `--num-iterations`: Total iterations (default: 100)
- `--games-per-iteration`: Self-play games per iteration (default: 50)
- `--mcts-simulations`: MCTS sims per move (default: 100)
- `--temperature`: Exploration temperature (default: 1.0)
- `--batch-size`: Training batch size (default: 128)
- `--learning-rate`: Adam LR (default: 0.001)

### Evaluation
- `--eval-frequency`: Evaluate every N iterations (default: 5)
- `--eval-games`: Games to evaluate (default: 20)

## Output

### Checkpoints
- `checkpoints/songo_latest.pt` - Latest model
- `checkpoints/songo_iter{N}.pt` - Periodic checkpoints

### Monitoring

During training, you'll see:

```
ITERATION 15/100
======================
[1/3] Self-Play (50 games, 100 MCTS sims/move)
Game 10/50 - Moves: 42 - Result: 1-0 - Total examples: 420
...

[2/3] Training (100 steps, batch size 128)
  Total Loss: 1.2345
  Policy Loss: 0.5678
  Value Loss: 0.6667

[3/3] Evaluation (vs Random, 20 games)
  Results: W18 D1 L1
  Win rate: 90.0%
```

## Expected Results

### After 10 iterations (1-2 hours)
- **vs Random:** ~70-80% win rate
- Network learns basic tactics

### After 50 iterations (6-8 hours)
- **vs Random:** ~95%+ win rate
- Network learns strategic patterns

### After 100 iterations (12-24 hours)
- **vs Random:** ~98%+ win rate
- Network plays near-optimal moves
- Ready to challenge strong human players

## Export for Browser

After training, export the model:

```bash
python export_model.py --checkpoint checkpoints/songo_latest.pt --output ../public/models/
```

This will create:
- `songo_model.json` - Model architecture + weights
- Ready for TensorFlow.js integration

## Testing Individual Components

### Test Environment
```bash
python songo_env.py
```

### Test Network
```bash
python songo_net.py
```

### Test MCTS
```bash
python mcts.py
```

### Test Self-Play
```bash
python self_play.py
```

## Advanced: Training on GPU

The code sélectionne automatiquement le meilleur backend disponible pour accélérer l'entraînement:

- CUDA (NVIDIA) → le plus rapide
- MPS (Apple Silicon, macOS 12.3+) → bon gain
- DirectML (Windows, via `torch-directml`, compatible NVIDIA/AMD/Intel) → gain modéré
- CPU → fallback

### Installation rapide

Choisissez l'option adaptée à votre machine:

1) NVIDIA (Windows/Linux) — PyTorch avec CUDA

```bash
# Exemple CUDA 12.1 (adaptez selon votre driver)
pip install torch --index-url https://download.pytorch.org/whl/cu121
```

2) Windows (AMD/Intel/NVIDIA) — DirectML

```bash
pip install torch-directml
```

3) macOS (Apple Silicon)

PyTorch utilise `mps` automatiquement (installez simplement `torch`).

### Vérification

Au lancement, les logs affichent le backend choisi, par ex.:

```
Device selection:
  torch.cuda.is_available(): True
  CUDA device count: 1
  Current device name: NVIDIA GeForce RTX ...
  Using backend: CUDA
  Using device: cuda:0
```

Si vous voyez `Using backend: CPU`, installez une roue adaptée (CUDA ou DirectML) et relancez Python.

Training sera ~3-5× plus rapide sur GPU.

## Hyperparameter Tuning

For best results with limited compute:

**Scenario 1: Fast prototyping (1-2 hours)**
```bash
python train.py --network-size small --mcts-simulations 50 --num-iterations 20
```

**Scenario 2: Balanced (6-8 hours)**
```bash
python train.py --mcts-simulations 100 --num-iterations 50
```

**Scenario 3: Maximum strength (24+ hours)**
```bash
python train.py --hidden-size 512 --mcts-simulations 200 --num-iterations 200
```

## Troubleshooting

### "Out of memory"
- Reduce `--batch-size` to 64 or 32
- Reduce `--hidden-size` to 128
- Use `--network-size small`

### "Training is slow"
- Reduce `--mcts-simulations` to 50
- Reduce `--games-per-iteration` to 20
- Use `--network-size small`

### "Win rate stuck at 60%"
- Increase `--mcts-simulations` to 200+
- Increase `--num-iterations`
- Check that `--use-augmentation` is enabled

## Architecture Details

### State Representation (17 features)
- Board[0-13]: Pit values (14 features)
- Scores[0-1]: Player scores (2 features)
- Current player (1 feature)

### Network Output
- **Policy head**: 14 values (move probabilities)
- **Value head**: 1 value in [-1, 1] (expected outcome)

### MCTS
- UCB formula: Q(s,a) + c_puct * P(s,a) * sqrt(N(s)) / (1 + N(s,a))
- Default c_puct = 1.0
- Temperature annealing after move 30

### Training Loss
- Policy loss: Cross-entropy with MCTS visit counts
- Value loss: MSE with game outcome
- Total loss = Policy loss + Value loss

## Next Steps

After training:
1. Test against the minimax AI (depth 35)
2. Export to browser (see export_model.py)
3. Let users play against it!
4. Collect more games for continued training

## Credits

Based on AlphaZero architecture by DeepMind.
Adapted for Songo (MPEM variant) by Claude & User.
