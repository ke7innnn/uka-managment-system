from PIL import Image

img_path = "/Users/kevinpimenta/Desktop/UKA MANAGEMENT SYSTEM/public/NEW LOGO UPDATE/UKA LOGO NEW.png"
try:
    with Image.open(img_path) as im:
        print(f"Format: {im.format}")
        print(f"Size: {im.size}")
        print(f"Mode: {im.mode}")
except Exception as e:
    print(f"Error: {e}")
