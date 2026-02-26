from PIL import Image

def process_image(input_path, output_path):
    # Open the generated image (1024x1024)
    img = Image.open(input_path)
    
    # The image model often draws a rounded square within a flat background.
    # To get a 100% full-bleed, edge-to-edge texture, we will crop directly into the center square, 
    # throwing away the outer ~15% margins on all sides where the border is usually drawn.
    
    width, height = img.size
    
    # Let's crop the central 700x700 area (discarding 162 pixels from each edge)
    # This guarantees we only get the pure, flat glass texture inside the drawn square.
    crop_margin = int(width * 0.16)
    
    left = crop_margin
    top = crop_margin
    right = width - crop_margin
    bottom = height - crop_margin
    
    cropped_img = img.crop((left, top, right, bottom))
    
    # Resize the perfectly flat cropped center back up to Apple's required 1024x1024
    final_img = cropped_img.resize((1024, 1024), Image.Resampling.LANCZOS)
    
    final_img.save(output_path)
    print(f"Successfully cropped full-bleed image to {output_path}")

# Run against the latest generated image
process_image(
    "/Users/lemonpapa/.gemini/antigravity/brain/f9839abf-7ed6-4ced-b94e-fd033caf9bdf/choir_tuner_seamless_icon_1772068752532.png", 
    "/Users/lemonpapa/.gemini/antigravity/brain/f9839abf-7ed6-4ced-b94e-fd033caf9bdf/choir_tuner_perfect_flush_icon.png"
)
