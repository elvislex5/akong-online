"""
AlphaZero for Songo — ONNX Export

Exports the trained PyTorch model to ONNX format for use in the browser
via ONNX Runtime Web.
"""
import torch
import argparse
import os
from pathlib import Path

from neural_network import SongoNet
from config import NetworkConfig


def export_to_onnx(
    checkpoint_path: str,
    output_path: str = "model.onnx",
    quantize: bool = True
):
    """
    Export a trained model to ONNX format.
    
    Args:
        checkpoint_path: Path to PyTorch checkpoint (.pt)
        output_path: Path for output ONNX file
        quantize: Whether to apply dynamic quantization
    """
    config = NetworkConfig()
    model = SongoNet(config)
    
    # Load checkpoint
    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()
    
    print(f"[Export] Loaded model from {checkpoint_path}")
    print(f"[Export] Parameters: {model.count_parameters():,}")
    
    # Create dummy input
    dummy_input = torch.randn(1, config.input_size)
    
    # Export to ONNX with dynamic batch size
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=18,
        do_constant_folding=True,
        input_names=['state'],
        output_names=['policy', 'value'],
        dynamic_axes={
            'state':  {0: 'batch_size'},
            'policy': {0: 'batch_size'},
            'value':  {0: 'batch_size'},
        }
    )
    
    # Pack external data into a single self-contained file (required for ONNX Runtime Web)
    import onnx as _onnx
    _model = _onnx.load(output_path)
    _onnx.save_model(_model, output_path, save_as_external_data=False)
    # Remove stale .data sidecar if present
    _data_file = output_path + '.data'
    if os.path.exists(_data_file):
        os.remove(_data_file)
        print(f"[Export] Packed external data into single file.")

    file_size = os.path.getsize(output_path) / 1024
    print(f"[Export] ONNX model saved: {output_path} ({file_size:.1f} KB)")
    
    # Validate ONNX model
    import onnx
    onnx_model = onnx.load(output_path)
    onnx.checker.check_model(onnx_model)
    print("[Export] ONNX model validation passed ✓")
    
    # Test with ONNX Runtime
    import onnxruntime as ort
    session = ort.InferenceSession(output_path)
    
    # Test batch_size=1
    test_input = dummy_input.numpy()
    outputs = session.run(None, {'state': test_input})
    print(f"[Export] ONNX Runtime test (batch=1):")
    print(f"  Policy shape: {outputs[0].shape} | Value shape: {outputs[1].shape}")

    # Test batch_size=8 (mirrors browser MCTS batch)
    import numpy as np
    batch8 = np.random.randn(8, config.input_size).astype(np.float32)
    outputs8 = session.run(None, {'state': batch8})
    print(f"[Export] ONNX Runtime test (batch=8):")
    print(f"  Policy shape: {outputs8[0].shape} | Value shape: {outputs8[1].shape}")
    print(f"[Export] Dynamic batch size: OK ✓")
    
    # Optional quantization
    if quantize:
        try:
            from onnxruntime.quantization import quantize_dynamic, QuantType
            
            quantized_path = output_path.replace('.onnx', '_quantized.onnx')
            quantize_dynamic(
                output_path,
                quantized_path,
                weight_type=QuantType.QInt8
            )
            
            q_size = os.path.getsize(quantized_path) / 1024
            print(f"[Export] Quantized model: {quantized_path} ({q_size:.1f} KB)")
            print(f"[Export] Size reduction: {(1 - q_size/file_size)*100:.1f}%")
        except ImportError:
            print("[Export] Quantization skipped (onnxruntime.quantization not available)")
    
    print("[Export] Done! ✓")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export Songo NN to ONNX")
    parser.add_argument("checkpoint", help="Path to PyTorch checkpoint")
    parser.add_argument("--output", default="model.onnx", help="Output ONNX path")
    parser.add_argument("--no-quantize", action="store_true", help="Skip quantization")
    args = parser.parse_args()
    
    export_to_onnx(args.checkpoint, args.output, quantize=not args.no_quantize)
