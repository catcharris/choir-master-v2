import os
import json
from PIL import Image

def process_icon():
    source_path = "/Volumes/Lemon SSD/antigravity_scratch/choir-tuner/app_icon.png"
    ios_dest_dir = "/Volumes/Lemon SSD/antigravity_scratch/choir-tuner/ios/App/App/Assets.xcassets/AppIcon.appiconset"
    watch_dest_dir = "/Volumes/Lemon SSD/antigravity_scratch/choir-tuner/ios/App/TunerWatch Watch App/Assets.xcassets/AppIcon.appiconset"
    
    if not os.path.exists(source_path):
        print(f"Error: {source_path} not found.")
        return

    # 1. Open and process the image
    img = Image.open(source_path)
    
    # iOS icons MUST NOT have an alpha channel (transparency).
    # If it has alpha, composite it over a black (or white) background.
    if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
        background = Image.new('RGB', img.size, (0, 0, 0)) # Using black as safe backdrop for dark glass theme
        background.paste(img, mask=img.convert('RGBA').split()[3]) # 3 is the alpha channel
        img = background
    else:
        img = img.convert('RGB')
        
    # Ensure it's exactly 1024x1024
    if img.size != (1024, 1024):
        img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
        
    # 2. Save for iOS App
    os.makedirs(ios_dest_dir, exist_ok=True)
    ios_img_path = os.path.join(ios_dest_dir, "AppIcon-512@2x.png")
    img.save(ios_img_path, format="PNG")
    
    ios_contents = {
      "images" : [
        {
          "filename" : "AppIcon-512@2x.png",
          "idiom" : "universal",
          "platform" : "ios",
          "size" : "1024x1024"
        }
      ],
      "info" : {
        "author" : "xcode",
        "version" : 1
      }
    }
    with open(os.path.join(ios_dest_dir, "Contents.json"), "w") as f:
        json.dump(ios_contents, f, indent=2)

    # 3. Save for WatchOS App
    os.makedirs(watch_dest_dir, exist_ok=True)
    watch_img_path = os.path.join(watch_dest_dir, "AppIcon-1024.png")
    img.save(watch_img_path, format="PNG")
    
    watch_contents = {
      "images" : [
        {
          "filename" : "AppIcon-1024.png",
          "idiom" : "universal",
          "platform" : "watchos",
          "size" : "1024x1024"
        }
      ],
      "info" : {
        "author" : "xcode",
        "version" : 1
      }
    }
    with open(os.path.join(watch_dest_dir, "Contents.json"), "w") as f:
        json.dump(watch_contents, f, indent=2)

    print("Success! App icons generated and injected for both iOS and watchOS.")

if __name__ == "__main__":
    process_icon()
