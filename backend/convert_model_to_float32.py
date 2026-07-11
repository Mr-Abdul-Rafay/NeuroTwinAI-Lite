import tensorflow as tf
import os

print("--- Converting model from float16 to float32 ---")
print("="*60)

# Path to your trained model
model_path = "C:/Users/HOME/Desktop/Fyp_NeuroTwinAI-Lite/backend/models/best_model.h5"

# Check if file exists
if not os.path.exists(model_path):
    print(f"Model not found at: {model_path}")
    exit(1)

# Set mixed precision policy to float32 before loading
tf.keras.mixed_precision.set_global_policy('float32')

print("Loading model...")
try:
    # Load model
    model = tf.keras.models.load_model(model_path, compile=False)
    print("Model loaded successfully.")
    
    # Check if we need to clone or rewrite. Sometimes just re-saving with the new policy is sufficient, 
    # but cloning ensures that all layers are instantiated using the new float32 global policy.
    print("Cloning model to apply float32 policy...")
    model_32 = tf.keras.models.clone_model(model)
    model_32.build(model.input_shape)
    
    # Copy weights
    print("Copying weights to float32 model...")
    model_32.set_weights(model.get_weights())
    
    # Save the converted model
    output_path = "C:/Users/HOME/Desktop/Fyp_NeuroTwinAI-Lite/backend/models/best_model_float32.h5"
    print("Saving converted model...")
    model_32.save(output_path)
    
    print(f"Converted model saved to: {output_path}")
    print(f"Size: {os.path.getsize(output_path) / (1024**2):.1f} MB")
except Exception as e:
    print(f"Error during conversion: {e}")
    exit(1)
