use akong_engine::{execute_move, valid_moves, GameState};
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;

fn play_random_game(rng: &mut ChaCha8Rng) -> u32 {
    let mut state = GameState::initial();
    let mut moves = 0u32;
    while !state.is_terminal() && moves < 500 {
        let vm = valid_moves(&state);
        if vm.is_empty() {
            break;
        }
        let pick = vm[rng.gen_range(0..vm.len())] as usize;
        let (next, _) = execute_move(&state, pick);
        state = next;
        moves += 1;
    }
    moves
}

fn bench_random_games(c: &mut Criterion) {
    c.bench_function("random_game_self_play", |b| {
        let mut rng = ChaCha8Rng::seed_from_u64(0xC0FFEE);
        b.iter(|| {
            let plies = play_random_game(&mut rng);
            black_box(plies);
        });
    });
}

criterion_group!(benches, bench_random_games);
criterion_main!(benches);
