import urllib.request
import zipfile
import xml.etree.ElementTree as ET
import os

print("=== INSPECTING DOCX FILES ===")

urls = {
  "RECOVERED-019F9BFA.docx": "https://teoggshqiyimbilbcvnv.supabase.co/storage/v1/object/public/uka-storage/documents/b6cc5f05-d0c8-48fe-9d91-b94573aca3f1/019f9bfa-b737-45a7-b892-fe5a6136a33f.docx",
  "RECOVERED-913F05A0.docx": "https://teoggshqiyimbilbcvnv.supabase.co/storage/v1/object/public/uka-storage/documents/b6cc5f05-d0c8-48fe-9d91-b94573aca3f1/913f05a0-ddb8-4df6-850d-c7ff2bb21378.docx"
}

os.makedirs("temp_docx", exist_ok=True)

for name, url in urls.items():
    print(f"\nDownloading {name}...")
    local_path = os.path.join("temp_docx", name)
    try:
        urllib.request.urlretrieve(url, local_path)
        print(f"Downloaded to {local_path}. Unzipping...")
        
        with zipfile.ZipFile(local_path) as z:
            # Main text is in word/document.xml
            doc_xml = z.read('word/document.xml')
            root = ET.fromstring(doc_xml)
            
            # Extract all text elements
            texts = []
            namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            for el in root.findall('.//w:t', namespaces):
                if el.text:
                    texts.append(el.text)
            
            full_text = " ".join(texts)
            print(f"📄 [TEXT CONTENT OF {name}]:")
            print(full_text[:1000])
    except Exception as e:
        print(f"Error processing {name}: {e}")

print("\nDone")
