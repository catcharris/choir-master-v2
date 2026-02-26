from PIL import Image

def process_image(input_path, output_path):
    img = Image.open(input_path)
    width, height = img.size
    
    # The inner glass square in the first image occupies the center.
    # We will crop the central 60% of the image to completely remove the dark background 
    # and the outer rounded corners of the inner square, leaving only the pure glass and music note/tuning fork.
    
    crop_size = int(width * 0.60)
    
    left = (width - crop_size) // 2
    top = (height - crop_size) // 2
    right = left + crop_size
    bottom = top + crop_size
    
    cropped_img = img.crop((left, top, right, bottom))
    
    # Resize back to 1024x1024 for Apple
    final_img = cropped_img.resize((1024, 1024), Image.Resampling.LANCZOS)
    
    final_img.save(output_path)
    print(f"Successfully cropped full-bleed image to {output_path}")

process_image(
    "/Users/lemonpapa/.gemini/antigravity/brain/f9839abf-7ed6-4ced-b94e-fd033caf9bdf/choir_tuner_app_icon_1772068155180.png", 
    "/Users/lemonpapa/.gemini/antigravity/brain/f9839abf-7ed6-4ced-b94e-fd033caf9bdf/choir_tuner_original_flush_icon.png"
)
