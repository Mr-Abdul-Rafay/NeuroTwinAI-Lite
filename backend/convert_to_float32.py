import tensorflow as tf
import numpy as np
import os

print("--- Re-converting model from float16 to float32 using config modification ---")
print("="*60)

# Paths
input_path = "C:/Users/HOME/Desktop/Fyp_NeuroTwinAI-Lite/backend/models/best_model.h5"
output_path = "C:/Users/HOME/Desktop/Fyp_NeuroTwinAI-Lite/backend/models/best_model_float32.h5"

if not os.path.exists(input_path):
    print(f"Model not found at: {input_path}")
    exit(1)

# Set global policy to float32
tf.keras.mixed_precision.set_global_policy('float32')

def fix_config_dtypes(config):
    """Recursively modify layer configurations to force float32 dtype/policies."""
    if isinstance(config, dict):
        # Override DTypePolicy configs
        if config.get('class_name') == 'DTypePolicy' and isinstance(config.get('config'), dict):
            print(f"Fixing DTypePolicy config: {config['config']}")
            config['config']['name'] = 'float32'
        # Override legacy or explicit string dtype specs
        if 'dtype' in config:
            if isinstance(config['dtype'], str) and config['dtype'] in ('float16', 'mixed_float16'):
                print(f"Fixing string dtype: {config['dtype']}")
                config['dtype'] = 'float32'
            elif isinstance(config['dtype'], dict):
                # If dtype is represented as a dictionary config
                fix_config_dtypes(config['dtype'])
        
        # Recurse for all dictionary values
        for key, val in config.items():
            fix_config_dtypes(val)
    elif isinstance(config, list):
        # Recurse for all list elements
        for item in config:
            fix_config_dtypes(item)

try:
    print("Loading original model (float16)...")
    # Load original model without compilation
    model = tf.keras.models.load_model(input_path, compile=False)
    print("Loaded model.")
    
    # Get model structure config
    config = model.get_config()
    
    # Modify structure config recursively to force float32
    print("Modifying model structure config to force float32 on all layers...")
    fix_config_dtypes(config)
    
    # Reconstruct the model structure under the float32 global policy
    print("Rebuilding model architecture from modified config...")
    model_32 = tf.keras.models.Model.from_config(config)
    
    # Copy weights over and cast them to float32
    print("Copying and casting weights to float32...")
    weights_32 = [w.astype(np.float32) for w in model.get_weights()]
    model_32.set_weights(weights_32)
    
    # Save the updated model
    print("Saving the converted model...")
    model_32.save(output_path)
    print(f"Successfully converted and saved model to: {output_path}")
    print(f"Size: {os.path.getsize(output_path) / (1024**2):.1f} MB")
    
    # Verify the dtypes of the converted model
    print("\nVerifying converted model layer dtypes:")
    for i, layer in enumerate(model_32.layers[:10]):
        print(f"   Layer {i}: {layer.name} -> dtype: {layer.dtype}, compute_dtype: {layer.compute_dtype}")
        
except Exception as e:
    print(f"Conversion failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)
