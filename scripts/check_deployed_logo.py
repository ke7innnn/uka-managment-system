import urllib.request
import hashlib
import os

url = "https://ukaapp.vercel.app/icon.png"
local_path = "/Users/kevinpimenta/Desktop/UKA MANAGEMENT SYSTEM/public/icon.png"
temp_path = "/Users/kevinpimenta/Desktop/UKA MANAGEMENT SYSTEM/public/temp_deployed_icon.png"

try:
    print(f"Downloading {url}...")
    urllib.request.urlretrieve(url, temp_path)
    
    # Calculate hashes
    with open(local_path, 'rb') as f1, open(temp_path, 'rb') as f2:
        hash_local = hashlib.md5(f1.read()).hexdigest()
        hash_deployed = hashlib.md5(f2.read()).hexdigest()
        
    print(f"Local Icon MD5: {hash_local}")
    print(f"Deployed Icon MD5: {hash_deployed}")
    
    if hash_local == hash_deployed:
        print("SUCCESS: The deployed icon on Vercel matches your new local icon!")
    else:
        print("WARNING: The deployed icon on Vercel DOES NOT match. It is still the old icon.")
        
    os.remove(temp_path)
except Exception as e:
    print(f"Error: {e}")
    if os.path.exists(temp_path):
        os.remove(temp_path)
