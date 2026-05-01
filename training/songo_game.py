"""
AlphaZero for Songo — Game Engine (Python port of songoLogic.ts + fastSongo.ts)

This is a faithful port of the Songo game rules:
- 14 pits (7 per player), 5 seeds per pit initially
- Distribution, capture (2-4 seeds), auto-capture, solidarity, starvation protection
- Last pit restriction, desperate auto-capture
"""
import numpy as np
from typing import Optional, List, Tuple
from config import GameConfig


class SongoGame:
    """
    Complete Songo game implementation.
    
    Board layout:
        Player 2 (top):  [13] [12] [11] [10] [9] [8] [7]
        Player 1 (bot):  [0]  [1]  [2]  [3]  [4] [5] [6]
    
    Player 0 = Player One (bottom, pits 0-6)
    Player 1 = Player Two (top, pits 7-13)
    """

    PITS_PER_PLAYER = 7
    TOTAL_PITS = 14
    INITIAL_SEEDS = 5
    WINNING_SCORE = 36  # > 35 to win

    def __init__(self, config: Optional[GameConfig] = None):
        self.config = config or GameConfig()
        self.reset()

    def reset(self):
        """Reset to initial state."""
        self.board = np.full(self.TOTAL_PITS, self.INITIAL_SEEDS, dtype=np.int32)
        self.scores = np.zeros(2, dtype=np.int32)
        self.current_player = 0  # Player One starts
        self.is_terminal = False
        self.winner = None  # 0, 1, or -1 (draw)
        self.solidarity_mode = False
        self.solidarity_beneficiary = None
        self.move_count = 0

    def clone(self) -> 'SongoGame':
        """Create a deep copy of the game state."""
        game = SongoGame.__new__(SongoGame)
        game.config = self.config
        game.board = self.board.copy()
        game.scores = self.scores.copy()
        game.current_player = self.current_player
        game.is_terminal = self.is_terminal
        game.winner = self.winner
        game.solidarity_mode = self.solidarity_mode
        game.solidarity_beneficiary = self.solidarity_beneficiary
        game.move_count = self.move_count
        return game

    @staticmethod
    def get_pit_owner(index: int) -> int:
        """Returns 0 for Player One (pits 0-6), 1 for Player Two (pits 7-13)."""
        return 0 if 0 <= index < 7 else 1

    @staticmethod
    def get_player_indices(player: int) -> List[int]:
        """Get pit indices belonging to a player."""
        return list(range(0, 7)) if player == 0 else list(range(7, 14))

    @staticmethod
    def get_opponent_indices(player: int) -> List[int]:
        """Get opponent's pit indices."""
        return list(range(7, 14)) if player == 0 else list(range(0, 7))

    def get_player_start(self, player: int) -> int:
        return 0 if player == 0 else 7

    def get_valid_moves(self) -> np.ndarray:
        """
        Returns array of valid pit indices for current player.
        Handles solidarity/feeding rules and last pit restriction.
        """
        if self.is_terminal:
            return np.array([], dtype=np.int32)

        my_indices = self.get_player_indices(self.current_player)
        opp_indices = self.get_opponent_indices(self.current_player)

        # Check if opponent is starving
        opp_seeds = sum(self.board[i] for i in opp_indices)
        
        # Determine if feeding is enforced
        enforce_feeding = (
            (self.solidarity_mode and self.solidarity_beneficiary is not None)
            or opp_seeds == 0
        )

        if enforce_feeding:
            target_indices = (
                self.get_player_indices(self.solidarity_beneficiary)
                if self.solidarity_mode and self.solidarity_beneficiary is not None
                else opp_indices
            )
        
        valid = []
        total_seeds = sum(self.board[i] for i in my_indices)

        for idx in my_indices:
            seeds = self.board[idx]
            if seeds == 0:
                continue

            # Last pit restriction: can't play 1 seed from last pit (6 or 13)
            # unless it's the absolute last seed (desperate auto-capture)
            is_last_pit = (self.current_player == 0 and idx == 6) or \
                          (self.current_player == 1 and idx == 13)
            if is_last_pit and seeds == 1:
                if total_seeds > 1:
                    continue  # Forbidden
                # total_seeds == 1: allowed (desperate auto-capture)

            if enforce_feeding:
                # Check if this move feeds the target
                feeds = False
                if seeds >= 14:
                    feeds = True
                else:
                    for s in range(1, seeds + 1):
                        target = (idx + s) % self.TOTAL_PITS
                        if target in target_indices:
                            feeds = True
                            break
                
                if not feeds:
                    continue  # Skip, will check below if ANY move can feed

            valid.append(idx)

        # If feeding is enforced but no move feeds, allow all non-empty moves
        if enforce_feeding and len(valid) == 0:
            for idx in my_indices:
                seeds = self.board[idx]
                if seeds == 0:
                    continue
                is_last_pit = (self.current_player == 0 and idx == 6) or \
                              (self.current_player == 1 and idx == 13)
                if is_last_pit and seeds == 1 and total_seeds > 1:
                    continue
                valid.append(idx)

        return np.array(valid, dtype=np.int32)

    def get_valid_moves_mask(self) -> np.ndarray:
        """Returns a binary mask of size 7 for valid moves (relative to current player)."""
        mask = np.zeros(7, dtype=np.float32)
        valid = self.get_valid_moves()
        start = self.get_player_start(self.current_player)
        for idx in valid:
            mask[idx - start] = 1.0
        return mask

    def execute_move(self, pit_index: int) -> None:
        """
        Execute a move in-place. Modifies the game state.
        pit_index is an absolute index (0-13).
        """
        assert not self.is_terminal, "Game is already over"
        
        board = self.board
        scores = self.scores
        current_player = self.current_player
        opponent = 1 - current_player

        my_indices = self.get_player_indices(current_player)
        opp_indices = self.get_opponent_indices(current_player)
        opp_start = self.get_player_start(opponent)

        # Calculate total seeds BEFORE picking up
        total_seeds_on_side = sum(board[i] for i in my_indices)
        is_last_pit = (current_player == 0 and pit_index == 6) or \
                      (current_player == 1 and pit_index == 13)

        seeds = board[pit_index]
        board[pit_index] = 0  # Pick up

        self.move_count += 1

        # --- Desperate Auto-Capture ---
        if total_seeds_on_side == 1 and is_last_pit:
            scores[current_player] += 1
            self.solidarity_mode = True
            self.solidarity_beneficiary = current_player
            self.current_player = opponent
            self._check_win_condition()
            return

        # --- Distribution ---
        current_idx = pit_index
        original_seeds = seeds

        if seeds >= 14:
            remaining_after_13 = seeds - 13
            is_auto_capture = remaining_after_13 % 7 == 1

            # First 13 seeds
            for _ in range(13):
                current_idx = (current_idx + 1) % self.TOTAL_PITS
                board[current_idx] += 1
                seeds -= 1

            if is_auto_capture:
                # Distribute remaining to opponent except last seed
                seeds_to_distribute = seeds - 1
                op_offset = 0
                for _ in range(seeds_to_distribute):
                    target = opp_start + (op_offset % 7)
                    board[target] += 1
                    current_idx = target
                    op_offset += 1

                # Auto-capture the last seed
                scores[current_player] += 1
                board[pit_index] = 0  # Ensure start pit stays 0

                self.current_player = opponent
                self._post_move_checks(current_player, opponent)
                return
            else:
                # Standard: distribute remainder in opponent side
                op_offset = 0
                while seeds > 0:
                    target = opp_start + (op_offset % 7)
                    board[target] += 1
                    current_idx = target
                    op_offset += 1
                    seeds -= 1
        else:
            # Standard simple distribution (< 14)
            while seeds > 0:
                current_idx = (current_idx + 1) % self.TOTAL_PITS
                board[current_idx] += 1
                seeds -= 1

        # --- Capture Logic ("La Prise") ---
        was_auto_capture = original_seeds >= 14 and (original_seeds - 13) % 7 == 1
        
        if not was_auto_capture:
            owner_of_last = self.get_pit_owner(current_idx)

            if owner_of_last != current_player and 2 <= board[current_idx] <= 4:
                # Check it's not opponent's starting pit
                is_opp_start = (current_player == 0 and current_idx == 7) or \
                               (current_player == 1 and current_idx == 0)

                if not is_opp_start:
                    # Build capture chain going backwards
                    capture_indices = []
                    check_idx = current_idx

                    while True:
                        if self.get_pit_owner(check_idx) == current_player:
                            break
                        count = board[check_idx]
                        if 2 <= count <= 4:
                            capture_indices.append(check_idx)
                        else:
                            break
                        check_idx = (check_idx - 1 + self.TOTAL_PITS) % self.TOTAL_PITS

                    if capture_indices:
                        # Check starvation protection (Grand Slam)
                        opp_pits_with_seeds = sum(1 for i in opp_indices if board[i] > 0)
                        is_grand_slam = (opp_pits_with_seeds == 7 and len(capture_indices) == 7)

                        if not is_grand_slam:
                            captured = sum(board[i] for i in capture_indices)
                            for i in capture_indices:
                                board[i] = 0
                            scores[current_player] += captured

        # --- End Turn ---
        self._post_move_checks(current_player, opponent)

    def _post_move_checks(self, current_player: int, opponent: int):
        """Post-move checks: solidarity, starvation, win condition."""
        board = self.board
        scores = self.scores

        opp_indices = self.get_player_indices(opponent)
        opp_seeds = sum(board[i] for i in opp_indices)

        # Solidarity check
        if self.solidarity_mode or opp_seeds == 0:
            fed = any(board[i] > 0 for i in opp_indices)
            if fed:
                self.solidarity_mode = False
                self.solidarity_beneficiary = None
            else:
                # Opponent still empty → game ends, current player collects all
                my_indices = self.get_player_indices(current_player)
                remaining = sum(board[i] for i in my_indices)
                for i in my_indices:
                    board[i] = 0
                scores[current_player] += remaining
                self._check_win_condition(force_end=True)
                return

        # Check if next player can play
        next_player = opponent
        next_indices = self.get_player_indices(next_player)
        next_seeds = sum(board[i] for i in next_indices)

        if next_seeds == 0:
            # Next player has no seeds → game ends
            my_indices = self.get_player_indices(current_player)
            remaining = sum(board[i] for i in my_indices)
            for i in my_indices:
                board[i] = 0
            scores[current_player] += remaining
            self._check_win_condition(force_end=True)
            return

        # Check if next player has any valid moves
        self.current_player = next_player
        valid = self.get_valid_moves()
        if len(valid) == 0:
            # Stalemate → each player collects their remaining seeds
            self._resolve_stalemate()
            return

        self._check_win_condition()

        # Safety: max game length
        if self.move_count >= self.config.max_game_length:
            self._resolve_stalemate()

    def _resolve_stalemate(self):
        """Resolve when no valid moves: each player collects their remaining seeds."""
        for i in range(self.TOTAL_PITS):
            if self.board[i] > 0:
                owner = self.get_pit_owner(i)
                self.scores[owner] += self.board[i]
                self.board[i] = 0
        
        self.is_terminal = True
        if self.scores[0] > 35:
            self.winner = 0
        elif self.scores[1] > 35:
            self.winner = 1
        else:
            self.winner = -1  # Draw

    def _check_win_condition(self, force_end: bool = False):
        """Check if someone has won."""
        if self.scores[0] > self.WINNING_SCORE - 1:  # > 35
            self.is_terminal = True
            self.winner = 0
            return
        if self.scores[1] > self.WINNING_SCORE - 1:  # > 35
            self.is_terminal = True
            self.winner = 1
            return

        if force_end:
            self.is_terminal = True
            if self.scores[0] > self.scores[1]:
                self.winner = 0
            elif self.scores[1] > self.scores[0]:
                self.winner = 1
            else:
                self.winner = -1  # Draw

    def get_result(self, player: int) -> float:
        """
        Get the game result from the perspective of `player`.
        Returns: 1.0 for win, -1.0 for loss, 0.0 for draw.
        """
        if not self.is_terminal:
            return 0.0
        if self.winner == -1:
            return 0.0
        return 1.0 if self.winner == player else -1.0

    def get_canonical_result(self) -> float:
        """Get result from perspective of current player (useful for training)."""
        if not self.is_terminal:
            return 0.0
        if self.winner == -1:
            return 0.0
        return 1.0 if self.winner == self.current_player else -1.0

    # =========================================================================
    # State Encoding for Neural Network
    # =========================================================================

    def encode_state(self) -> np.ndarray:
        """
        Encode the game state as an 80-feature vector for the neural network.
        All features are from the CURRENT PLAYER's perspective (canonical).

        v2 additions (from "Le Songo" book by Zue Ntougou):
        [64-70] : Landing position for each of my 7 pits — (pit+seeds)%14 / 13
                  (Direct materialization of the book's 5 affine equations.)
        [71]    : My Yini count — pits with exactly 5 seeds /7
        [72]    : Opponent Yini count /7
        [73]    : My Olôa count — pits with exactly 14 seeds /7
        [74]    : Opponent Olôa count /7
        [75]    : My Akuru count — pits with ≥19 seeds /7
        [76]    : Opponent Akuru count /7
        [77-79] : Padding / reserved for future features

        Zone layout (Option C, tête at pit 0):
          Tête      : relative pits 0,1,2  (safe/opening zone)
          Pivot     : relative pit  3       (central pivot)
          Membres   : relative pits 4,5,6  (contains the restricted last pit)

        BASE FEATURES [0-27]
        [0-6]   : My pit seeds (/70), canonical current-player view
        [7-13]  : Opponent pit seeds (/70)
        [14]    : My score (/70)
        [15]    : Opponent score (/70)
        [16]    : I must feed opponent (solidarity, beneficiary = opponent)
        [17]    : Score difference (/70)
        [18]    : My total seeds (/70)
        [19]    : Opponent total seeds (/70)
        [20]    : Board total seeds (/70)
        [21]    : My non-empty pit count (/7)
        [22]    : Opponent non-empty pit count (/7)
        [23]    : My seeds that can reach opponent (/70)
        [24]    : Opponent must feed me (solidarity, beneficiary = me)
        [25]    : Game progress — total captured /70
        [26]    : Max seeds on board (/70)
        [27]    : I have a Maison (14+ seeds, binary)
        [28-31] : Padding (zeros)

        ZONE FEATURES [32-37]
        [32]    : My seeds in Tête zone (pits 0-2) /21
        [33]    : My seeds in Pivot zone (pit 3)   /14
        [34]    : My seeds in Membres zone (pits 4-6) /21
        [35]    : Opponent seeds in Tête zone /21
        [36]    : Opponent seeds in Pivot zone /14
        [37]    : Opponent seeds in Membres zone /21

        MAISON PROXIMITY [38-44]  — per-pit gradient toward the 14-seed weapon
        [38-44] : min(seeds_i, 14)/14 for each of my 7 pits (relative 0-6)

        CAPTURE POTENTIAL [45-51]  — simplified: does playing pit i land last seed
                                      on an opponent pit that will have 2-4 seeds?
        [45-51] : capture_potential_i for each of my 7 pits (0=no, 1=yes, or /7)

        VULNERABILITY [52-57]
        [52]    : Vulnerable pits in my Tête (seeds in [2-4]) /3
        [53]    : Vulnerable pit in my Pivot (binary)
        [54]    : Vulnerable pits in my Membres /3
        [55]    : Exposed opponent pits in Tête /3
        [56]    : Exposed opponent pit in Pivot (binary)
        [57]    : Exposed opponent pits in Membres /3

        STRATEGIC BALANCE [58-63]
        [58]    : Opponent Maison count /7
        [59]    : My closest pit to Maison: max(min(seeds,14))/14
        [60]    : Opponent closest pit to Maison
        [61]    : Seed imbalance by zone — (my_tête - opp_tête) / 21
        [62]    : Seed imbalance membres — (my_membres - opp_membres) / 21
        [63]    : Padding
        """
        state = np.zeros(80, dtype=np.float32)

        cp = self.current_player
        op = 1 - cp
        cp_start = 0 if cp == 0 else 7
        op_start = 7 if cp == 0 else 0
        board = self.board

        # ── Base features [0-27] ─────────────────────────────────────────────
        for i in range(7):
            state[i]     = board[cp_start + i] / 70.0
            state[7 + i] = board[op_start + i] / 70.0

        state[14] = self.scores[cp] / 70.0
        state[15] = self.scores[op] / 70.0
        state[16] = 1.0 if (self.solidarity_mode and self.solidarity_beneficiary == op) else 0.0
        state[17] = (self.scores[cp] - self.scores[op]) / 70.0

        cp_seeds = sum(board[cp_start + i] for i in range(7))
        op_seeds = sum(board[op_start + i] for i in range(7))
        state[18] = cp_seeds / 70.0
        state[19] = op_seeds / 70.0
        state[20] = (cp_seeds + op_seeds) / 70.0
        state[21] = sum(1 for i in range(7) if board[cp_start + i] > 0) / 7.0
        state[22] = sum(1 for i in range(7) if board[op_start + i] > 0) / 7.0

        reach_seeds = 0
        for i in range(7):
            idx = cp_start + i
            s = board[idx]
            if s > 0:
                last_drop = (idx + s) % 14
                if self.get_pit_owner(last_drop) != cp or s >= 14:
                    reach_seeds += s
        state[23] = reach_seeds / 70.0

        state[24] = 1.0 if (self.solidarity_mode and self.solidarity_beneficiary == cp) else 0.0
        total_captured = self.scores[0] + self.scores[1]
        state[25] = total_captured / 70.0
        state[26] = max(board) / 70.0
        state[27] = 1.0 if any(board[cp_start + i] >= 14 for i in range(7)) else 0.0

        # ── Bidoua + Menace double [28-31] ────────────────────────────────────
        # Bidoua (liberté de circulation) : graines dans des cases dont le coup
        # ne dépose PAS la dernière graine dans une case adverse capturable.
        # = graines "libres" qui peuvent bouger sans nourrir l'adversaire.
        my_bidoua = 0
        op_bidoua = 0
        my_threat_count = 0  # Nombre de mes cases menaçantes (capture possible)
        op_threat_count = 0

        for i in range(7):
            # Joueur courant
            s = board[cp_start + i]
            if s > 0:
                if s >= 14:
                    my_bidoua += s  # Grenier = liberté maximale
                    my_threat_count += 1
                else:
                    last_pos = (cp_start + i + s) % 14
                    if self.get_pit_owner(last_pos) == op:
                        post = board[last_pos] + 1
                        if 2 <= post <= 4:
                            my_threat_count += 1  # Case menaçante
                        else:
                            my_bidoua += s  # Atterrit chez adversaire mais pas de capture
                    else:
                        my_bidoua += s  # Atterrit dans mon propre camp

            # Adversaire
            t = board[op_start + i]
            if t > 0:
                if t >= 14:
                    op_bidoua += t
                    op_threat_count += 1
                else:
                    last_pos = (op_start + i + t) % 14
                    if self.get_pit_owner(last_pos) == cp:
                        post = board[last_pos] + 1
                        if 2 <= post <= 4:
                            op_threat_count += 1
                        else:
                            op_bidoua += t
                    else:
                        op_bidoua += t

        state[28] = my_bidoua / 70.0
        state[29] = 1.0 if my_threat_count >= 2 else 0.0  # Menace double
        state[30] = op_bidoua / 70.0
        state[31] = 1.0 if op_threat_count >= 2 else 0.0  # Menace double adverse

        # ── Zone features [32-37] ────────────────────────────────────────────
        # Zones (relative): Tête=[0,1,2]  Pivot=[3]  Membres=[4,5,6]
        my_tete    = sum(board[cp_start + i] for i in range(3))
        my_pivot   = board[cp_start + 3]
        my_membres = sum(board[cp_start + i] for i in range(4, 7))
        op_tete    = sum(board[op_start + i] for i in range(3))
        op_pivot   = board[op_start + 3]
        op_membres = sum(board[op_start + i] for i in range(4, 7))

        state[32] = my_tete    / 21.0
        state[33] = my_pivot   / 14.0
        state[34] = my_membres / 21.0
        state[35] = op_tete    / 21.0
        state[36] = op_pivot   / 14.0
        state[37] = op_membres / 21.0

        # ── Maison proximity [38-44] — per-pit gradient toward the weapon ────
        for i in range(7):
            state[38 + i] = min(board[cp_start + i], 14) / 14.0

        # ── Capture potential [45-51] ─────────────────────────────────────────
        # Simplified: does playing pit i land the last seed on an opponent pit
        # that will reach [2,3,4] seeds after the drop?
        for i in range(7):
            idx = cp_start + i
            s = board[idx]
            if 0 < s < 14:
                last_pos = (idx + s) % 14
                if self.get_pit_owner(last_pos) == op:
                    post_count = board[last_pos] + 1
                    if 2 <= post_count <= 4:
                        # Estimate chain: scan backwards while capturable
                        total_cap = post_count
                        check = (last_pos - 1 + 14) % 14
                        while self.get_pit_owner(check) == op and 2 <= board[check] <= 4:
                            total_cap += board[check]
                            check = (check - 1 + 14) % 14
                        state[45 + i] = min(total_cap, 14) / 14.0
            elif s >= 14:
                state[45 + i] = 1.0  # Maison = maximum capture potential

        # ── Vulnerability [52-57] ─────────────────────────────────────────────
        # A pit is "exposed" when it currently holds seeds in [2,3,4]:
        # the opponent just needs to land their last seed there to capture.
        def exposed(pit_abs):
            return 2 <= board[pit_abs] <= 4

        state[52] = sum(1 for i in range(3)    if exposed(cp_start + i)) / 3.0
        state[53] = 1.0 if exposed(cp_start + 3) else 0.0
        state[54] = sum(1 for i in range(4, 7) if exposed(cp_start + i)) / 3.0
        state[55] = sum(1 for i in range(3)    if exposed(op_start + i)) / 3.0
        state[56] = 1.0 if exposed(op_start + 3) else 0.0
        state[57] = sum(1 for i in range(4, 7) if exposed(op_start + i)) / 3.0

        # ── Strategic balance [58-62] ─────────────────────────────────────────
        state[58] = sum(1 for i in range(7) if board[op_start + i] >= 14) / 7.0
        state[59] = max(min(board[cp_start + i], 14) for i in range(7)) / 14.0
        state[60] = max(min(board[op_start + i], 14) for i in range(7)) / 14.0
        state[61] = (my_tete    - op_tete)    / 21.0
        state[62] = (my_membres - op_membres) / 21.0
        # [63]: padding — remains 0

        # ── v2: Book features [64-76] ─────────────────────────────────────────
        # Landing positions [64-70] — direct answer to the book's affine equations.
        # For each of my 7 pits, where does the last seed land? Normalized to [0, 1].
        # 0 means empty pit (no move possible from there).
        for i in range(7):
            s = board[cp_start + i]
            if s > 0:
                landing = (cp_start + i + s) % 14
                state[64 + i] = (landing + 1) / 14.0  # +1 to distinguish from empty

        # Yini [71-72] — pits with exactly 5 seeds (mother/blocked pit)
        my_yini = sum(1 for i in range(7) if board[cp_start + i] == 5)
        op_yini = sum(1 for i in range(7) if board[op_start + i] == 5)
        state[71] = my_yini / 7.0
        state[72] = op_yini / 7.0

        # Olôa [73-74] — pits with exactly 14 seeds (sentinel pit)
        my_oloa = sum(1 for i in range(7) if board[cp_start + i] == 14)
        op_oloa = sum(1 for i in range(7) if board[op_start + i] == 14)
        state[73] = my_oloa / 7.0
        state[74] = op_oloa / 7.0

        # Akuru [75-76] — pits with ≥19 seeds (critical mass)
        my_akuru = sum(1 for i in range(7) if board[cp_start + i] >= 19)
        op_akuru = sum(1 for i in range(7) if board[op_start + i] >= 19)
        state[75] = my_akuru / 7.0
        state[76] = op_akuru / 7.0

        # [77-79]: reserved — remain 0

        return state

    # =========================================================================
    # Action Space Utilities
    # =========================================================================

    def action_to_pit_index(self, action: int) -> int:
        """Convert relative action (0-6) to absolute pit index."""
        return action + self.get_player_start(self.current_player)

    def pit_index_to_action(self, pit_index: int) -> int:
        """Convert absolute pit index to relative action (0-6)."""
        return pit_index - self.get_player_start(self.current_player)

    def step(self, action: int) -> Tuple[np.ndarray, float, bool]:
        """
        Take a step (relative action 0-6).
        Returns: (encoded_state, reward, done)
        """
        pit_index = self.action_to_pit_index(action)
        player_before = self.current_player
        self.execute_move(pit_index)
        
        reward = self.get_result(player_before) if self.is_terminal else 0.0
        return self.encode_state(), reward, self.is_terminal

    def __repr__(self):
        p2_pits = ' '.join(f'{self.board[i]:2d}' for i in range(13, 6, -1))
        p1_pits = ' '.join(f'{self.board[i]:2d}' for i in range(7))
        return (
            f"P2: [{p2_pits}]  Score: {self.scores[1]}\n"
            f"P1: [{p1_pits}]  Score: {self.scores[0]}\n"
            f"Current: P{self.current_player + 1} | "
            f"Move: {self.move_count} | "
            f"Terminal: {self.is_terminal}"
        )
