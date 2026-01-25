from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_gradient(width, height, start_color, end_color):
    base = Image.new('RGBA', (width, height), start_color)
    top = Image.new('RGBA', (width, height), end_color)
    mask = Image.new('L', (width, height))
    mask_data = []
    for y in range(height):
        mask_data.extend([int(255 * (y / height))] * width)
    mask.putdata(mask_data)
    base.paste(top, (0, 0), mask)
    return base

# Config
width, height = 512, 512
# Colors extracted closely from the user's reference image
# Top Mint: #DFFFE9 (approx) -> Bottom Blue: #CDEEFF (approx)
start_color = (223, 255, 233, 255) # Pastel mint
end_color = (195, 230, 255, 255)   # Pastel blue

# 1. Create Background
icon = create_gradient(width, height, start_color, end_color)

# 2. Load Microphone Resource
# Using the flat icon I generated earlier, which is clean vector style
mic_path = "/Users/shib.bose/.gemini/antigravity/brain/d5138471-a56a-4664-ab72-26ff685a8375/speaking_icon_flat_1769368879436.png"
try:
    mic_img = Image.open(mic_path).convert("RGBA")
    
    # Analyze the mic image: it likely has a background I need to remove.
    # Since the request asked for "no visible pixels", I'll do a simple color keying if it's solid, 
    # but better to assume the generator made a square image.
    # I'll crop the center or resize it.
    
    # Ideally, I'd remove the background. Let's try a simple heuristic:
    # If the corners are the background color, make that transparent.
    datas = mic_img.getdata()
    new_data = []
    bg_color = datas[0] # Top-left pixel
    
    # Tolerance for background removal
    tol = 30
    for item in datas:
        if all(abs(item[i] - bg_color[i]) < tol for i in range(3)):
            new_data.append((255, 255, 255, 0)) # Transparent
        else:
            new_data.append(item)
    mic_img.putdata(new_data)
    
    # Resize to fit nicely in center (approx 50% scale)
    scale_factor = 0.55
    new_w = int(width * scale_factor)
    new_h = int(height * scale_factor)
    mic_img = mic_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Perfect Center position
    pos_x = (width - new_w) // 2
    pos_y = (height - new_h) // 2 
    
    icon.paste(mic_img, (pos_x, pos_y), mic_img)

    
except Exception as e:
    print(f"Error processing microphone image: {e}")

# Pill and Text removed as per request
# 3. Add Label Pill (Removed)


# Save result
output_path = "static/images/speaking_icon.png"
icon.save(output_path)
print(f"Icon created at {output_path}")
