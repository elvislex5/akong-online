"""
Pit Evaluation — AlphaZero vs AlphaZero

Le Pit est l'arène où le challenger (nouveau modèle entraîné) affronte le
champion actuel (meilleur modèle connu). Le challenger ne remplace le
champion QUE s'il gagne plus de PIT_WIN_THRESHOLD des parties.

Cela garantit que le modèle déployé en production ne peut que progresser,
jamais régresser.

Usage:
  python pit_evaluation.py challenger.pt champion.pt
  python pit_evaluation.py challenger.pt champion.pt --games 40 --sims 200
"""
import argparse
import sys
import io
import torch
import numpy as np
from tqdm import tqdm

# Force UTF-8 output (Windows cp1252 ne supporte pas les caractères spéciaux)
if sys.platform == 'win32' and hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from songo_game import SongoGame
from neural_network import SongoNet, create_network
from mcts import MCTS
from config import MCTSConfig, NetworkConfig


def load_model(checkpoint_path: str, config: NetworkConfig, device: str) -> SongoNet:
    """Charge un modèle depuis un checkpoint."""
    model = create_network(config, device=device)
    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=False)
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()
    return model


def play_pit_game(
    mcts_p1: MCTS,
    mcts_p2: MCTS,
    temperature: float = 0.1,
) -> int:
    """
    Joue une partie entre deux agents MCTS.
    mcts_p1 joue en tant que Joueur 0, mcts_p2 en tant que Joueur 1.
    Retourne le gagnant : 0, 1, ou -1 (nul).
    """
    game = SongoGame()

    while not game.is_terminal:
        valid = game.get_valid_moves()
        # Guard: no valid moves but terminal not set → force stalemate resolution
        if len(valid) == 0:
            game._resolve_stalemate()
            break

        current_mcts = mcts_p1 if game.current_player == 0 else mcts_p2
        action, _ = current_mcts.get_action(game, temperature=temperature, add_noise=False)

        pit_index = game.action_to_pit_index(action)
        if pit_index not in valid:
            # Fallback : action invalide → premier coup valide disponible
            pit_index = int(valid[0])

        game.execute_move(pit_index)

    return game.winner  # 0, 1, ou -1


def run_pit(
    challenger_path: str,
    champion_path: str,
    num_games: int = 40,
    num_simulations: int = 200,
    win_threshold: float = 0.55,
    device: str = "cpu",
    verbose: bool = True,
) -> dict:
    """
    Lance le Pit : challenger vs champion sur num_games parties.

    Les parties sont jouées en alternant les côtés pour éviter le biais
    du premier joueur.

    Retourne un dict avec les résultats et la décision.
    """
    config = NetworkConfig()

    if verbose:
        print(f"\n[Pit] Chargement des modèles...")
        print(f"  Challenger : {challenger_path}")
        print(f"  Champion   : {champion_path}")

    challenger_model = load_model(challenger_path, config, device)
    champion_model   = load_model(champion_path,   config, device)

    mcts_config = MCTSConfig(num_simulations=num_simulations)

    challenger_mcts = MCTS(challenger_model, mcts_config, device=device,
                          batch_size=16, use_symmetry=True)
    champion_mcts   = MCTS(champion_model,   mcts_config, device=device,
                          batch_size=16, use_symmetry=True)

    challenger_wins = 0
    champion_wins   = 0
    draws           = 0

    if verbose:
        print(f"[Pit] {num_games} parties | {num_simulations} simulations/coup\n")

    half = num_games // 2

    # Première moitié : challenger = P1, champion = P2
    for i in tqdm(range(half), desc="Challenger(P1) vs Champion(P2)", disable=not verbose):
        winner = play_pit_game(challenger_mcts, champion_mcts)
        if winner == 0:
            challenger_wins += 1
        elif winner == 1:
            champion_wins += 1
        else:
            draws += 1

    # Deuxième moitié : champion = P1, challenger = P2
    for i in tqdm(range(num_games - half), desc="Champion(P1) vs Challenger(P2)", disable=not verbose):
        winner = play_pit_game(champion_mcts, challenger_mcts)
        if winner == 1:
            challenger_wins += 1
        elif winner == 0:
            champion_wins += 1
        else:
            draws += 1

    total_decisive = challenger_wins + champion_wins
    win_rate = challenger_wins / total_decisive if total_decisive > 0 else 0.0
    promoted = win_rate >= win_threshold

    if verbose:
        print(f"\n[Pit] ═══════════════════════════════════════")
        print(f"[Pit]  Challenger : {challenger_wins} victoires")
        print(f"[Pit]  Champion   : {champion_wins} victoires")
        print(f"[Pit]  Nuls       : {draws}")
        print(f"[Pit]  Taux       : {win_rate:.1%} (seuil={win_threshold:.0%})")
        if promoted:
            print(f"[Pit]  RÉSULTAT   : ✅ CHALLENGER PROMU — nouveau champion !")
        else:
            print(f"[Pit]  RÉSULTAT   : ❌ Champion conservé — challenger insuffisant.")
        print(f"[Pit] ═══════════════════════════════════════\n")

    return {
        'challenger_wins': challenger_wins,
        'champion_wins':   champion_wins,
        'draws':           draws,
        'win_rate':        win_rate,
        'promoted':        promoted,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pit evaluation AlphaZero vs AlphaZero")
    parser.add_argument("challenger", help="Checkpoint du challenger (nouveau modèle)")
    parser.add_argument("champion",   help="Checkpoint du champion actuel")
    parser.add_argument("--games",    type=int,   default=40,   help="Nombre de parties (défaut: 40)")
    parser.add_argument("--sims",     type=int,   default=200,  help="Simulations MCTS/coup (défaut: 200)")
    parser.add_argument("--threshold",type=float, default=0.55, help="Seuil de victoire (défaut: 0.55)")
    args = parser.parse_args()

    result = run_pit(
        args.challenger,
        args.champion,
        num_games=args.games,
        num_simulations=args.sims,
        win_threshold=args.threshold,
    )
