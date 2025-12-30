@echo off
REM Quick start script for Songo RL training (Windows)

echo =========================================
echo SONGO RL - QUICK START
echo =========================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python not found. Please install Python 3.8+
    exit /b 1
)

echo [OK] Python found
python --version

REM Install dependencies
echo.
echo [1/4] Installing dependencies...
pip install -q -r requirements.txt
echo [OK] Dependencies installed

REM Test environment
echo.
echo [2/4] Testing environment...
python -c "from songo_env import SongoEnv; env = SongoEnv(); print('[OK] Environment OK')"

REM Test network
echo.
echo [3/4] Testing network...
python -c "from songo_net import SongoNetSmall; import torch; net = SongoNetSmall(); print('[OK] Network OK')"

REM Detect available acceleration backends
echo.
echo [Info] Checking GPU backends...
python -c "import sys,importlib;import torch;print('  torch.cuda.is_available():',torch.cuda.is_available());\
print('  torch.backends.mps.is_available() (macOS):',getattr(torch.backends,'mps',None) and torch.backends.mps.is_available());\
td=importlib.util.find_spec('torch_directml');print('  torch-directml installed:',bool(td));\
print('  Tip: If all false, you are on CPU. On Windows: install CUDA wheel (NVIDIA) or torch-directml.')"

REM Run quick training
echo.
echo [4/4] Starting quick training (10 iterations, ~10 minutes)...
echo     This will train a small model to verify everything works.
echo     For full training, use: python train.py (see README.md)
echo.

python train.py --network-size small --hidden-size 128 --num-iterations 10 --games-per-iteration 10 --mcts-simulations 50 --eval-frequency 5 --eval-games 10 --checkpoint-frequency 5

echo.
echo =========================================
echo QUICK START COMPLETED!
echo =========================================
echo.
echo Next steps:
echo   1. Check checkpoints/songo_latest.pt
echo   2. For full training: python train.py --num-iterations 100
echo   3. Export model: python export_model.py --checkpoint checkpoints/songo_latest.pt
echo.
pause
