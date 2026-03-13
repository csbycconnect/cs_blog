import json
import difflib

user_list = """
Dr. Balakrishnan C
/assets/faculties/BK.JPG

Dr. Anusha James
/assets/faculties/anusha.JPG

Dr. Deepa BG
/assets/faculties/deepabg.JPG

Dr. Deepa S
/assets/faculties/deepas.JPG

Dr. Gayathry S Warriar
/assets/faculties/g3.JPG

Dr. Gopinath R
/assets/faculties/gopi.JPG

Dr. Hemanth K
/assets/faculties/hemanth.JPG

Dr. Jayadurga R
/assets/faculties/jayadurga.JPG

Dr. Jayapriya J
/assets/faculties/jayapriya.JPG

Dr. Juliet Rozario
/assets/faculties/julietr.JPG

Dr. Kalpana P
/assets/faculties/kalpana.JPG

Dr. Kannan M
/assets/faculties/kannan.JPG

Dr. Kavitha S
/assets/faculties/kavitha.JPG

Dr. Kokilavani T
/assets/faculties/kokilavani.JPG

Dr. Kousalya R
/assets/faculties/kousalya.jpg

Dr. Krishna Presanakumar
/assets/faculties/krishna.jpg

Dr Laxmi Basappa Dharmannavar
/assets/faculties/laxmi d.JPG

Dr Loveline Zeema J
/assets/faculties/loveline.JPG

Dr. Mahalakshmi J
/assets/faculties/mahalakshmi.JPG

Dr. Manimekala
/assets/faculties/manimekaala.JPG

Dr Margaret Savitha P
/assets/faculties/margaret.JPG

Dr Mithun D Souza
/assets/faculties/mithund.png

Dr. Praveen P
/assets/faculties/praveenp.jpg

Dr Priya Stella Mary I
/assets/faculties/priya stella.JPG

Dr Rajasekaran N
/assets/faculties/rajasekarn.jpg

Dr Raju Ramakrishna Gondkar
/assets/faculties/rajuRGONDKAR.JPG

Dr Ramkumar S
/assets/faculties/ramkumar.JPG

Dr Ravi Dandu
/assets/faculties/ravidandu.jpg

Dr Sindhu V
/assets/faculties/sindhu.JPG

Dr Siva Balan RV
/assets/faculties/sivabalan.JPG

Dr Smruti Dilip Dabhole
/assets/faculties/smruthi.jpg

Dr Stephen R
/assets/faculties/stephen r.JPG

Dr Suganthi J
/assets/faculties/sugandhi.JPG

Dr Teena Jose
/assets/faculties/teena.JPG

Dr Thontadari C
/assets/faculties/thondadari.JPG

Dr Umamaheswari D
/assets/faculties/umamaheshwari.JPG

Dr Vinay M
/assets/faculties/vinaym.JPG
"""

def normalize(s):
    return s.lower().replace('.', '').replace('dr', '').replace(' ', '').strip()

lines = [l.strip() for l in user_list.split('\n') if l.strip()]
mapping = {}
for i in range(0, len(lines), 2):
    mapping[lines[i]] = lines[i+1]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Extract names for fuzzy matching
    json_names = {item['name']: normalize(item['name']) for item in data}
    map_names = {k: normalize(k) for k in mapping.keys()}
    
    matched = set()
    
    for item in data:
        n = normalize(item['name'])
        # Try finding a direct match or highly similar map
        # using difflib
        closest = difflib.get_close_matches(n, map_names.values(), n=1, cutoff=0.5)
        if closest:
            c = closest[0]
            for k, v in map_names.items():
                if v == c:
                    item['imagePath'] = mapping[k]
                    matched.add(k)
                    break
                    
    # Add remaning ones
    for k in mapping:
        if k not in matched:
            data.append({
                "name": k,
                "designation": "Faculty",
                "imagePath": mapping[k],
                "bio": []
            })
            
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)
        
process_file('d:/csbyc-blog/src/data/faculty.json')
process_file('d:/csbyc-blog/src/data/faculty_raw.json')
print("Done")
