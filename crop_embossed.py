from PIL import Image

def process_image(input_path, output_path):
    img = Image.open(input_path)
    width, height = img.size
    
    # We want to mathematically crop OUT the entire background from the previous image,
    # so that the borders of the 1024x1024 canvas ARE the edges of the glass itself.
    
    # The inner glass block is roughly 60% of the image size in the center.
    crop_size = int(width * 0.58)
    
    left = (width - crop_size) // 2
    top = (height - crop_size) // 2
    right = left + crop_size
    bottom = top + crop_size
    
    cropped_img = img.crop((left, top, right, bottom))
    
    # Resize the isolated 3D block back up to 1024x1024 so it is 100% full-bleed frame-to-frame.
    final_img = cropped_img.resize((1024, 1024), Image.Resampling.LANCZOS)
    
    final_img.save(output_path)
    print(f"Successfully stretched 3D block to {output_path}")

process_image(
    "/Users/lemonpapa/.gemini/antigravity/brain/f9839abf-7ed6-4ced-b94e-fd033caf9bdf/choir_tuner_embossed_glass_icon_1772069924134.png", 
    "/Users/lemonpapa/.gemini/antigravity/brain/f9839abf-7ed6-4ced-b94e-fd033caf9bdf/choir_tuner_true_edge_icon.png"
)
