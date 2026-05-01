use serde::{Deserialize, Serialize};

pub const PITS_PER_PLAYER: usize = 7;
pub const TOTAL_PITS: usize = 14;
pub const INITIAL_SEEDS: u8 = 5;
pub const WINNING_SCORE_GABON: u8 = 36;
pub const WINNING_SCORE_CAMEROON: u8 = 40;

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Player {
    One = 0,
    Two = 1,
}

impl Player {
    #[inline]
    pub const fn opponent(self) -> Self {
        match self {
            Player::One => Player::Two,
            Player::Two => Player::One,
        }
    }

    #[inline]
    pub const fn score_slot(self) -> usize {
        self as usize
    }

    #[inline]
    pub const fn my_start(self) -> usize {
        match self {
            Player::One => 0,
            Player::Two => 7,
        }
    }

    #[inline]
    pub const fn opp_start(self) -> usize {
        self.opponent().my_start()
    }

    #[inline]
    pub const fn last_pit(self) -> usize {
        match self {
            Player::One => 6,
            Player::Two => 13,
        }
    }
}

#[inline]
pub const fn pit_owner(idx: usize) -> Player {
    if idx < 7 {
        Player::One
    } else {
        Player::Two
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum GameStatus {
    Playing,
    Finished,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum WinState {
    Player(Player),
    Draw,
}

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Variant {
    Gabon,
    Cameroon,
}

impl Variant {
    #[inline]
    pub const fn winning_score(self) -> u8 {
        match self {
            Variant::Gabon => WINNING_SCORE_GABON,
            Variant::Cameroon => WINNING_SCORE_CAMEROON,
        }
    }
}

impl Default for Variant {
    fn default() -> Self {
        Variant::Gabon
    }
}

/// Canonical Songo (Mgpwem) game state.
///
/// Layout mirrors `GameState` in `types.ts` with exact semantics of
/// `services/songoLogic.ts`. Pits 0..7 = Player One, 7..14 = Player Two.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct GameState {
    pub board: [u8; TOTAL_PITS],
    pub scores: [u8; 2],
    pub current_player: Player,
    pub status: GameStatus,
    pub winner: Option<WinState>,
    pub solidarity_mode: bool,
    pub solidarity_beneficiary: Option<Player>,
    pub variant: Variant,
}

impl GameState {
    pub fn initial() -> Self {
        Self::initial_with_variant(Variant::Gabon)
    }

    pub fn initial_with_variant(variant: Variant) -> Self {
        Self {
            board: [INITIAL_SEEDS; TOTAL_PITS],
            scores: [0, 0],
            current_player: Player::One,
            status: GameStatus::Playing,
            winner: None,
            solidarity_mode: false,
            solidarity_beneficiary: None,
            variant,
        }
    }

    #[inline]
    pub fn winning_score(&self) -> u8 {
        self.variant.winning_score()
    }

    #[inline]
    pub fn is_terminal(&self) -> bool {
        matches!(self.status, GameStatus::Finished)
    }

    #[inline]
    pub fn seeds_on_side(&self, player: Player) -> u16 {
        let start = player.my_start();
        let mut sum: u16 = 0;
        for i in 0..PITS_PER_PLAYER {
            sum += self.board[start + i] as u16;
        }
        sum
    }

    #[inline]
    pub fn seeds_in_play(&self) -> u16 {
        let mut sum: u16 = 0;
        for i in 0..TOTAL_PITS {
            sum += self.board[i] as u16;
        }
        sum
    }
}

impl Default for GameState {
    fn default() -> Self {
        Self::initial()
    }
}
