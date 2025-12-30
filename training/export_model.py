"""
Export trained PyTorch model to JSON format for browser integration
Can be loaded with TensorFlow.js or custom inference
"""

import torch
import json
import numpy as np
import argparse
import os
from songo_net import SongoNet, SongoNetSmall

def export_to_json(model, output_path):
    """
    Export model weights to JSON format
    Simple format that can be loaded in browser
    """
    model.eval()

    weights = {}

    for name, param in model.named_parameters():
        # Convert to numpy and then to list for JSON serialization
        weights[name] = param.detach().cpu().numpy().tolist()

    # Model metadata
    model_config = {
        'architecture': model.__class__.__name__,
        'input_size': 17,
        'output_size': 14,
        'hidden_size': model.fc1.out_features if hasattr(model, 'fc1') else 256,
        'weights': weights
    }

    # Save to JSON
    with open(output_path, 'w') as f:
        json.dump(model_config, f)

    file_size = os.path.getsize(output_path) / (1024 * 1024)
    print(f"✓ Model exported to {output_path}")
    print(f"  File size: {file_size:.2f} MB")

    return model_config


def create_onnx_export(model, output_path):
    """
    Export to ONNX format (alternative, better for production)
    Can be used with onnxruntime-web
    """
    model.eval()

    # Dummy input
    dummy_input = torch.randn(1, 17)

    # Export
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=11,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['policy_logits', 'value'],
        dynamic_axes={
            'input': {0: 'batch_size'},
            'policy_logits': {0: 'batch_size'},
            'value': {0: 'batch_size'}
        }
    )

    file_size = os.path.getsize(output_path) / (1024 * 1024)
    print(f"✓ ONNX model exported to {output_path}")
    print(f"  File size: {file_size:.2f} MB")


def create_inference_example():
    """Create example TypeScript inference code"""

    code = '''
// Example: Load and use the exported model in TypeScript

class SongoNeuralAI {
  private weights: any;

  async loadModel(modelPath: string) {
    const response = await fetch(modelPath);
    const modelData = await response.json();
    this.weights = modelData.weights;
    console.log(`Model loaded: ${modelData.architecture}`);
  }

  // Simple inference (you'll need to implement matrix operations)
  predict(stateFeatures: number[]): { policy: number[], value: number } {
    // This is a simplified example
    // For production, use TensorFlow.js or ONNX.js

    // Forward pass through network
    let x = stateFeatures;

    // Layer 1
    x = this.dense(x, this.weights['fc1.weight'], this.weights['fc1.bias']);
    x = this.relu(x);

    // Layer 2
    x = this.dense(x, this.weights['fc2.weight'], this.weights['fc2.bias']);
    x = this.relu(x);

    // Policy head
    let policy = this.dense(x, this.weights['policy_fc.weight'], this.weights['policy_fc.bias']);
    policy = this.softmax(policy);

    // Value head
    let value = this.dense(x, this.weights['value_fc.weight'], this.weights['value_fc.bias']);
    value = Math.tanh(value[0]);

    return { policy, value };
  }

  private dense(input: number[], weight: number[][], bias: number[]): number[] {
    // Matrix multiplication: output = input @ weight.T + bias
    const output = new Array(weight.length).fill(0);
    for (let i = 0; i < weight.length; i++) {
      for (let j = 0; j < input.length; j++) {
        output[i] += input[j] * weight[i][j];
      }
      output[i] += bias[i];
    }
    return output;
  }

  private relu(x: number[]): number[] {
    return x.map(v => Math.max(0, v));
  }

  private softmax(x: number[]): number[] {
    const expX = x.map(v => Math.exp(v));
    const sum = expX.reduce((a, b) => a + b, 0);
    return expX.map(v => v / sum);
  }
}

// Usage
const ai = new SongoNeuralAI();
await ai.loadModel('/models/songo_model.json');

// Get state from game
const stateFeatures = gameState.getFeatures(); // 17 numbers

// Predict
const { policy, value } = ai.predict(stateFeatures);

// policy[0-13] = probabilities for each pit
// value = expected outcome [-1, 1]
'''

    return code


def main(args):
    print("="*60)
    print("EXPORTING SONGO MODEL FOR BROWSER")
    print("="*60)

    # Load checkpoint
    print(f"\nLoading checkpoint: {args.checkpoint}")
    checkpoint = torch.load(args.checkpoint, map_location='cpu')

    # Create model
    if args.network_size == 'small':
        model = SongoNetSmall(hidden_size=args.hidden_size)
    else:
        model = SongoNet(hidden_size=args.hidden_size)

    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()

    print(f"✓ Model loaded (epoch {checkpoint['epoch']})")
    print(f"  Parameters: {sum(p.numel() for p in model.parameters()):,}")

    # Create output directory
    os.makedirs(args.output_dir, exist_ok=True)

    # Export to JSON
    print("\nExporting to JSON format...")
    json_path = os.path.join(args.output_dir, 'songo_model.json')
    export_to_json(model, json_path)

    # Export to ONNX (optional)
    if args.export_onnx:
        print("\nExporting to ONNX format...")
        onnx_path = os.path.join(args.output_dir, 'songo_model.onnx')
        create_onnx_export(model, onnx_path)

    # Create example code
    example_code = create_inference_example()
    example_path = os.path.join(args.output_dir, 'inference_example.ts')
    with open(example_path, 'w') as f:
        f.write(example_code)
    print(f"\n✓ Example code saved to {example_path}")

    print("\n" + "="*60)
    print("EXPORT COMPLETED!")
    print("="*60)
    print(f"\nFiles created in {args.output_dir}:")
    print(f"  - songo_model.json (weights for custom inference)")
    if args.export_onnx:
        print(f"  - songo_model.onnx (for ONNX Runtime Web)")
    print(f"  - inference_example.ts (TypeScript example)")

    print("\nNext steps:")
    print("1. Copy files to your frontend public/models/ directory")
    print("2. Implement inference in TypeScript (see inference_example.ts)")
    print("3. OR use TensorFlow.js / ONNX Runtime Web for easier integration")
    print("\nRecommended: Use ONNX Runtime Web for production")
    print("  npm install onnxruntime-web")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Export Songo model for browser')

    parser.add_argument('--checkpoint', type=str, required=True,
                        help='Path to checkpoint file')
    parser.add_argument('--output-dir', type=str, default='../public/models',
                        help='Output directory')
    parser.add_argument('--network-size', type=str, default='standard',
                        choices=['small', 'standard'],
                        help='Network size (must match training)')
    parser.add_argument('--hidden-size', type=int, default=256,
                        help='Hidden size (must match training)')
    parser.add_argument('--export-onnx', action='store_true', default=True,
                        help='Also export to ONNX format')

    args = parser.parse_args()

    main(args)
