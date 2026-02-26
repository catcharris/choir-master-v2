from PIL import Image, ImageDraw, ImageFilter

def create_final_icon():
    original = Image.open("/Users/lemonpapa/.gemini/antigravity/brain/f9839abf-7ed6-4ced-b94e-fd033caf9bdf/choir_tuner_app_icon_1772068155180.png").convert("RGBA")
    
    # The glowing circle and fork is roughly within the center 720x720 area
    extract_size = 720
    left = (1024 - extract_size) // 2
    top = (1024 - extract_size) // 2
    logo_patch = original.crop((left, top, left + extract_size, top + extract_size))
    
    # Create luminosity alpha mask to isolate just the glowing parts
    r, g, b, a = logo_patch.split()
    luminance = Image.eval(logo_patch.convert("L"), lambda x: 255 if x > 150 else max(0, int((x-70)*2.5)))
    logo_extracted = logo_patch.copy()
    logo_extracted.putalpha(luminance)
    
    # Draw a 1024x1024 edge-to-edge gradient background
    new_img = Image.new('RGB', (1024, 1024), (0, 0, 0))
    draw = ImageDraw.Draw(new_img)
    center_x, center_y = 512, 512
    max_radius = 800
    
    for r_circ in range(max_radius, 0, -2):
        factor = r_circ / max_radius
        if factor > 0.6:
            ratio = (factor - 0.6) / 0.4
            red = int(220 * (1 - ratio) + 20 * ratio)
            green = int(255 * (1 - ratio) + 30 * ratio)
            blue = int(100 * (1 - ratio) + 35 * ratio)
        else:
            ratio = factor / 0.6
            red = int(150 * (1 - ratio) + 220 * ratio)
            green = int(255 * (1 - ratio) + 255 * ratio)
            blue = int(180 * (1 - ratio) + 100 * ratio)
            
        draw.ellipse((center_x - r_circ, center_y - r_circ, center_x + r_circ, center_y + r_circ), fill=(red, green, blue))
    
    # Apply a strong blur to the background to ensure it's a perfectly smooth flat surface
    glass_bg = new_img.filter(ImageFilter.GaussianBlur(radius=25))
    
    # Paste the extracted full circle + fork safely in the center with plenty of margin
    paste_x = (1024 - extract_size) // 2
    paste_y = (1024 - extract_size) // 2
    glass_bg.paste(logo_extracted, (paste_x, paste_y), logo_extracted)
    
    output_path = "/Users/lemonpapa/.gemini/antigravity/brain/f9839abf-7ed6-4ced-b94e-fd033caf9bdf/choir_tuner_perfect_circle_icon.png"
    glass_bg.save(output_path)
    print(f"Success! Final icon saved to {output_path}")

create_final_icon()
