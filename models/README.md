# AI Models Directory

This directory contains the AI models used by Dixi for inference.

## Model Requirements

- **Format**: ONNX, TensorFlow.js, or PyTorch
- **Size**: 7B to 30B parameters (quantized)
- **Optimization**: INT8 or INT4 quantization for GPU efficiency

## Supported Models

- LLaMA 2 (quantized)
- Mistral (quantized)
- Phi-2/3 (quantized)
- Custom fine-tuned models

## Model Placement

Place your model files in this directory:
```
models/
  ├── llama-7b-q4/
  │   ├── model.onnx
  │   └── config.json
  ├── mistral-7b-q8/
  │   └── model files...
  └── custom-model/
      └── model files...
```

## Configuration

Update the `.env` file to specify which model to use:
```
MODEL_PATH=./models/llama-7b-q4
MODEL_SIZE=7B
MODEL_TYPE=quantized
```

## Notes

- Models are not included in version control due to size
- Download models separately from HuggingFace or other sources
- Ensure you have appropriate licensing for the models you use
