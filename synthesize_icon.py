from PIL import Image, ImageDraw, ImageFilter
import math

# 1. Open the beloved original image
original = Image.open("/Users/lemonpapa/.gemini/antigravity/brain/f9839abf-7ed6-4ced-b94e-fd033caf9bdf/choir_tuner_app_icon_1772068155180.png").convert("RGBA")
width, height = original.size

# 2. Extract ONLY the central logo (tuning fork + note) without zooming in too much
# The logo is roughly in the center 400x400 area, but we'll take a safe 500x500
extract_size = 500
left = (width - extract_size) // 2
top = (height - extract_size) // 2
logo_patch = original.crop((left, top, left + extract_size, top + extract_size))

# To make the logo blend perfectly, we need to try and isolate the bright white parts
# Create an alpha mask based on brightness
r, g, b, a = logo_patch.split()
# Rough luminance formula
luminance = Image.eval(logo_patch.convert("L"), lambda x: 255 if x > 180 else max(0, int((x-100)*1.8)))
logo_extracted = logo_patch.copy()
logo_extracted.putalpha(luminance)

# 3. Create a brand new 1024x1024 PERFECTLY FLAT canvas
new_img = Image.new('RGB', (1024, 1024), (0, 0, 0))
draw = ImageDraw.Draw(new_img)

# 4. Draw a beautiful, smooth radial gradient (Mint Green to Yellow)
center_x = 512
center_y = 512
max_radius = 800

for r_circ in range(max_radius, 0, -2):
    # Calculate interpolation factor (0.0 at center, 1.0 at edge)
    factor = r_circ / max_radius
    
    # Outer color: Deep grey/black (Glass edge)
    # Inner color: Bright Mint Green / Yellow mix
    # Center: (150, 255, 180) Mint
    # Mid: (220, 255, 100) Yellow
    
    if factor > 0.6:
        # Fade from Yellow to Dark edge
        ratio = (factor - 0.6) / 0.4
        red = int(220 * (1 - ratio) + 30 * ratio)
        green = int(255 * (1 - ratio) + 40 * ratio)
        blue = int(100 * (1 - ratio) + 45 * ratio)
    else:
        # Fade from Mint to Yellow
        ratio = factor / 0.6
        red = int(150 * (1 - ratio) + 220 * ratio)
        green = int(255 * (1 - ratio) + 255 * ratio)
        blue = int(180 * (1 - ratio) + 100 * ratio)
        
    draw.ellipse((center_x - r_circ, center_y - r_circ, center_x + r_circ, center_y + r_circ), fill=(red, green, blue))

# Add a slight blur to simulate frosted glass
glass_bg = new_img.filter(ImageFilter.GaussianBlur(radius=15))

# 5. Paste the extracted logo perfectly into the center
paste_x = (1024 - extract_size) // 2
paste_y = (1024 - extract_size) // 2
glass_bg.paste(logo_extracted, (paste_x, paste_y), logo_extracted)

# Save the absolute master icon
output_path = "/Users/lemonpapa/.gemini/antigravity/brain/f9839abf-7ed6-4ced-b94e-fd033caf9bdf/choir_tuner_synthetic_glass_icon.png"
glass_bg.save(output_path)
print(f"Successfully generated synthetic glass icon at {output_path}")

