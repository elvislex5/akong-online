"""
Export SongoNetV3 (training/network_v3.py) to ONNX.

The exported graph keeps all four heads:
    inputs : state   float32 (B, 16, 2, 7)
    outputs: policy  float32 (B, 7)        — logits
             value   float32 (B, 1)        — tanh
             score_diff float32 (B, 1)     — aux
             wdl     float32 (B, 3)        — aux logits

Runtime (services/neuralAI.ts) currently only consumes policy+value; the
extras are harmless and let us swap encodings later without re-exporting.

Usage:
    python export_onnx_v3.py --ckpt runs/v3-warmstart/champion.pt \
                             --out  public/songo_nn_v3.onnx
"""
from __future__ import annotations
import argparse
from pathlib import Path

import torch

from network_v3 import SongoNetV3, NetworkV3Config


class _ExportWrapper(torch.nn.Module):
    """Wraps SongoNetV3 to return a tuple (ONNX prefers tuples over dicts)."""

    def __init__(self, net: SongoNetV3):
        super().__init__()
        self.net = net

    def forward(self, state: torch.Tensor):
        out = self.net(state)
        return (
            out["policy"],
            out["value"],
            out["score_diff"],
            out["wdl"],
        )


def export(ckpt_path: str, out_path: str, opset: int = 17):
    ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
    net = SongoNetV3(NetworkV3Config())
    net.load_state_dict(ckpt["model"])
    net.eval()

    wrapper = _ExportWrapper(net)
    dummy = torch.zeros(1, 16, 2, 7, dtype=torch.float32)

    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(
        wrapper,
        (dummy,),
        out_path,
        input_names=["state"],
        output_names=["policy", "value", "score_diff", "wdl"],
        dynamic_axes={
            "state": {0: "batch"},
            "policy": {0: "batch"},
            "value": {0: "batch"},
            "score_diff": {0: "batch"},
            "wdl": {0: "batch"},
        },
        opset_version=opset,
        do_constant_folding=True,
    )

    # Quick verify: load with onnxruntime if available
    try:
        import onnxruntime as ort
        sess = ort.InferenceSession(out_path, providers=["CPUExecutionProvider"])
        out = sess.run(None, {"state": dummy.numpy()})
        print(f"[ok] ONNX runs. shapes: {[o.shape for o in out]}")
    except ImportError:
        print("[warn] onnxruntime not installed — skipping load check")

    size_mb = Path(out_path).stat().st_size / 1e6
    print(f"[done] {out_path} ({size_mb:.1f} MB, opset {opset})")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--ckpt", required=True, help="path to .pt checkpoint")
    p.add_argument("--out", default="songo_nn_v3.onnx")
    p.add_argument("--opset", type=int, default=17)
    args = p.parse_args()
    export(args.ckpt, args.out, args.opset)


if __name__ == "__main__":
    main()
