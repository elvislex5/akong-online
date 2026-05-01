"""
State encoding v3 — 2D planes (16, 2, 7).

Maps a Songo (Mgpwem) game state to a tensor of shape (channels=16, height=2, width=7),
always from the **current player's perspective** (row 0 = current player's pits,
row 1 = opponent's pits). This makes the network player-symmetric, so a single
set of weights handles both players.

Channel layout
--------------
 0: seed count / 15 (normalized, soft cap)
 1: pit is mine (always 1 on row 0, 0 on row 1)
 2: pit is opponent's (always 0 on row 0, 1 on row 1)
 3: pit is a Yini (count == 5)
 4: pit is vulnerable — mine side (count ∈ [2, 4])
 5: pit is vulnerable — opponent side (count ∈ [2, 4])
 6: pit is a grenier Ndà — mine (count ≥ 14)
 7: pit is a grenier Ndà — opponent (count ≥ 14)
 8: pit is empty (count == 0)
 9: broadcast — opponent-starving flag (opp has 0 seeds)
10: broadcast — solidarity mode active
11: broadcast — my score / 36
12: broadcast — opponent score / 36
13: broadcast — (my score - opp score) / 36
14: broadcast — seeds in play / 70
15: broadcast — constant 1.0 (bias channel)
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Optional

import numpy as np


@dataclass
class StateView:
    """
    Minimal canonical representation of a Songo position. This mirrors the TS
    `GameState` shape but only carries the fields the encoder reads. The caller
    is responsible for producing it from whatever source (engine, self-play,
    replay buffer, …).

    All fields are in absolute coordinates:
      board[0..7]  = Player One's pits (pits 0..=6)
      board[7..14] = Player Two's pits (pits 7..=13)
      scores[0]    = Player One's score
      scores[1]    = Player Two's score
    """
    board: np.ndarray  # shape (14,), dtype=int or u8
    scores: tuple[int, int]
    current_player: int  # 0 = Player One, 1 = Player Two
    solidarity_mode: bool = False
    solidarity_beneficiary: Optional[int] = None  # 0, 1, or None

    @classmethod
    def initial(cls) -> "StateView":
        return cls(
            board=np.full(14, 5, dtype=np.int16),
            scores=(0, 0),
            current_player=0,
        )


CHANNELS = 16
HEIGHT = 2
WIDTH = 7


def encode(view: StateView) -> np.ndarray:
    """
    Encode a StateView into a float32 tensor of shape (16, 2, 7).
    Always from the current player's perspective.
    """
    board = np.asarray(view.board, dtype=np.int16)
    assert board.shape == (14,), f"expected board[14], got {board.shape}"

    cp = view.current_player
    assert cp in (0, 1)

    # My side = pits [0..7] if cp==0, else [7..14]. Row 0 = my pits.
    if cp == 0:
        my_row = board[0:7]
        opp_row = board[7:14]
        my_score = view.scores[0]
        opp_score = view.scores[1]
    else:
        my_row = board[7:14]
        opp_row = board[0:7]
        my_score = view.scores[1]
        opp_score = view.scores[0]

    out = np.zeros((CHANNELS, HEIGHT, WIDTH), dtype=np.float32)

    # 0: normalized seed count (cap at 15 for normalization; greniers spill over softly)
    out[0, 0, :] = np.clip(my_row, 0, 60) / 15.0
    out[0, 1, :] = np.clip(opp_row, 0, 60) / 15.0

    # 1: mine indicator
    out[1, 0, :] = 1.0
    # 2: opp indicator
    out[2, 1, :] = 1.0

    # 3: Yini (==5)
    out[3, 0, :] = (my_row == 5).astype(np.float32)
    out[3, 1, :] = (opp_row == 5).astype(np.float32)

    # 4: vulnerable mine (2..4)
    out[4, 0, :] = ((my_row >= 2) & (my_row <= 4)).astype(np.float32)
    # 5: vulnerable opp (2..4)
    out[5, 1, :] = ((opp_row >= 2) & (opp_row <= 4)).astype(np.float32)

    # 6: grenier mine (>=14)
    out[6, 0, :] = (my_row >= 14).astype(np.float32)
    # 7: grenier opp
    out[7, 1, :] = (opp_row >= 14).astype(np.float32)

    # 8: empty
    out[8, 0, :] = (my_row == 0).astype(np.float32)
    out[8, 1, :] = (opp_row == 0).astype(np.float32)

    # 9: opp starving
    opp_total = int(opp_row.sum())
    if opp_total == 0:
        out[9, :, :] = 1.0

    # 10: solidarity mode active
    if view.solidarity_mode:
        out[10, :, :] = 1.0

    # 11: my score / 36
    out[11, :, :] = my_score / 36.0
    # 12: opp score / 36
    out[12, :, :] = opp_score / 36.0
    # 13: score diff
    out[13, :, :] = (my_score - opp_score) / 36.0

    # 14: seeds in play
    seeds_in_play = int(board.sum())
    out[14, :, :] = seeds_in_play / 70.0

    # 15: bias channel
    out[15, :, :] = 1.0

    return out


def encode_batch(views: list[StateView]) -> np.ndarray:
    """Batch version: returns (B, 16, 2, 7) float32."""
    return np.stack([encode(v) for v in views], axis=0)


def mirror(encoded: np.ndarray) -> np.ndarray:
    """
    Horizontal mirror augmentation: reflects the board left↔right.
    This is a genuine symmetry of Mgpwem (modulo "last pit" rule — see note).

    Note: Songo's last-pit restriction is position-dependent (pit 6 for P1,
    pit 13 for P2), so strict horizontal mirror is NOT an exact symmetry. Use
    this only as a training-time augmentation, not as a hard invariant.
    """
    return encoded[..., ::-1].copy()


def valid_move_mask(view: StateView) -> np.ndarray:
    """
    Boolean mask of shape (7,) where mask[i] = True iff pit `(cp*7 + i)` has
    seeds, in current-player perspective. Finer rules (solidarity, last pit)
    are enforced by the engine, not the encoder — callers filter illegal
    moves with the engine's `is_valid_move`.
    """
    cp = view.current_player
    if cp == 0:
        return np.asarray(view.board[0:7], dtype=np.int16) > 0
    return np.asarray(view.board[7:14], dtype=np.int16) > 0
