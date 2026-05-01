"""
SongoNet v3 — ResNet 2D backbone with dual policy/value heads + auxiliary heads.

Designed for the Akong "divine" engine:
  - Exploits the (2×7) spatial structure of the board with 3×3 convolutions.
  - Player-symmetric: every input is encoded from the current player's
    perspective (see `encoding_v3.py`), so a single set of weights handles
    both players.
  - Dual heads: policy (7 logits) + value (scalar, tanh).
  - Auxiliary heads trained jointly for a stronger signal:
      * score_diff: regression to (my_score - opp_score) / 36 in [-1, 1].
      * wdl: 3-way classifier supervised by EGTB (Win/Draw/Loss) when
             available; falls back to value sign when not.
"""
from __future__ import annotations
from dataclasses import dataclass

import torch
import torch.nn as nn
import torch.nn.functional as F


@dataclass
class NetworkV3Config:
    input_channels: int = 16
    num_blocks: int = 10        # residual tower depth
    filters: int = 192          # channel width inside the tower — 10×192 ≈ 7M params
    policy_size: int = 7
    use_aux_heads: bool = True  # score-diff + WDL classifier
    kernel_size: int = 3


class ResBlockConv(nn.Module):
    """Two-conv residual block with batch norm, ReLU."""

    def __init__(self, filters: int, kernel_size: int = 3):
        super().__init__()
        pad = kernel_size // 2
        self.conv1 = nn.Conv2d(filters, filters, kernel_size=kernel_size, padding=pad, bias=False)
        self.bn1 = nn.BatchNorm2d(filters)
        self.conv2 = nn.Conv2d(filters, filters, kernel_size=kernel_size, padding=pad, bias=False)
        self.bn2 = nn.BatchNorm2d(filters)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = x
        x = F.relu(self.bn1(self.conv1(x)), inplace=True)
        x = self.bn2(self.conv2(x))
        x = x + residual
        return F.relu(x, inplace=True)


class SongoNetV3(nn.Module):
    """
    Input  : (B, C=16, H=2, W=7) state encoding (see encoding_v3.py).
    Output : a dict with
               "policy"     : (B, 7) logits (use F.log_softmax for loss)
               "value"      : (B, 1) tanh value estimate ∈ [-1, 1]
               "score_diff" : (B, 1) score differential in [-1, 1]   (aux)
               "wdl"        : (B, 3) logits for {Win, Draw, Loss}    (aux)
    """

    def __init__(self, config: NetworkV3Config | None = None):
        super().__init__()
        self.config = config or NetworkV3Config()
        c = self.config

        # Stem: lift input channels to tower width
        self.stem = nn.Sequential(
            nn.Conv2d(c.input_channels, c.filters, kernel_size=c.kernel_size,
                      padding=c.kernel_size // 2, bias=False),
            nn.BatchNorm2d(c.filters),
            nn.ReLU(inplace=True),
        )

        # Residual tower
        self.blocks = nn.ModuleList([
            ResBlockConv(c.filters, c.kernel_size) for _ in range(c.num_blocks)
        ])

        # Policy head: 1x1 conv → flatten → FC → logits(7)
        #   feature map (B, 2, 2, 7) → (B, 28) → (B, 7)
        self.policy_conv = nn.Conv2d(c.filters, 2, kernel_size=1, bias=False)
        self.policy_bn = nn.BatchNorm2d(2)
        self.policy_fc = nn.Linear(2 * 2 * 7, c.policy_size)

        # Value head: 1x1 conv → flatten → FC → tanh
        #   feature map (B, 1, 2, 7) → (B, 14) → (B, 64) → (B, 1)
        self.value_conv = nn.Conv2d(c.filters, 1, kernel_size=1, bias=False)
        self.value_bn = nn.BatchNorm2d(1)
        self.value_fc1 = nn.Linear(2 * 7, 64)
        self.value_fc2 = nn.Linear(64, 1)

        if c.use_aux_heads:
            # Score-diff regression (reuses value conv features)
            self.score_diff_fc1 = nn.Linear(2 * 7, 32)
            self.score_diff_fc2 = nn.Linear(32, 1)

            # WDL classifier: its own 1x1 conv head
            self.wdl_conv = nn.Conv2d(c.filters, 2, kernel_size=1, bias=False)
            self.wdl_bn = nn.BatchNorm2d(2)
            self.wdl_fc = nn.Linear(2 * 2 * 7, 3)

    def forward(self, x: torch.Tensor) -> dict[str, torch.Tensor]:
        # Shape sanity check is intentionally omitted to keep the forward
        # traceable for torch.onnx.export.
        h = self.stem(x)
        for block in self.blocks:
            h = block(h)

        # Policy head
        p = F.relu(self.policy_bn(self.policy_conv(h)), inplace=True)
        p = p.flatten(start_dim=1)
        policy = self.policy_fc(p)

        # Value head
        v = F.relu(self.value_bn(self.value_conv(h)), inplace=True)
        v = v.flatten(start_dim=1)  # (B, 14)
        v_hidden = F.relu(self.value_fc1(v), inplace=True)
        value = torch.tanh(self.value_fc2(v_hidden))

        out = {"policy": policy, "value": value}

        if self.config.use_aux_heads:
            # Score-diff regression: uses same (B, 14) flattened value conv
            sd = F.relu(self.score_diff_fc1(v), inplace=True)
            score_diff = torch.tanh(self.score_diff_fc2(sd))
            out["score_diff"] = score_diff

            # WDL classifier
            w = F.relu(self.wdl_bn(self.wdl_conv(h)), inplace=True)
            w = w.flatten(start_dim=1)
            wdl_logits = self.wdl_fc(w)
            out["wdl"] = wdl_logits

        return out

    def count_parameters(self) -> int:
        return sum(p.numel() for p in self.parameters() if p.requires_grad)


def build_network(config: NetworkV3Config | None = None, device: str = "cpu") -> SongoNetV3:
    model = SongoNetV3(config)
    model = model.to(device)
    return model


if __name__ == "__main__":
    model = build_network()
    n_params = model.count_parameters()
    print(f"SongoNetV3 parameters: {n_params:,} ({n_params / 1e6:.2f} M)")

    # Forward smoke test
    batch = torch.randn(4, 16, 2, 7)
    out = model(batch)
    for k, v in out.items():
        print(f"  {k:12s}: {tuple(v.shape)}")
