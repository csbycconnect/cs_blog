import json
import difflib

user_list = """
Dr. Balakrishnan C
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/BK.JPG

Dr. Anusha James
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/anusha.JPG

Dr. Deepa BG
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/deepabg.JPG

Dr. Deepa S
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/deepas.JPG

Dr. Gayathry S Warriar
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/g3.JPG

Dr. Gopinath R
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/gopi.JPG

Dr. Hemanth K
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/hemanth.JPG

Dr. Jayadurga R
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/jayadurga.JPG

Dr. Jayapriya J
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/jayapriya.JPG

Dr. Juliet Rozario
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/julietr.JPG

Dr. Kalpana P
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/kalpana.JPG

Dr. Kannan M
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/kannan.JPG

Dr. Kavitha S
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/kavitha.JPG

Dr. Kokilavani T
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/kokilavani.JPG

Dr. Kousalya R
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/kousalya.jpg

Dr. Krishna Presanakumar
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/krishna.jpg

Dr Laxmi Basappa Dharmannavar
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/laxmi%20d.JPG

Dr Loveline Zeema J
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/loveline.JPG

Dr. Mahalakshmi J
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/mahalakshmi.JPG

Dr. Manimekala
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/manimekaala.JPG

Dr Margaret Savitha P
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/margaret.JPG

Dr Mithun D Souza
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/mithund.png

Dr. Praveen P
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/praveenp.jpg

Dr Priya Stella Mary I
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/priya%20stella.JPG

Dr Rajasekaran N
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/rajasekarn.jpg

Dr Raju Ramakrishna Gondkar
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/rajuRGONDKAR.JPG

Dr Ramkumar S
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/ramkumar.JPG

Dr Ravi Dandu
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/ravidandu.jpg

Dr Sindhu V
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/sindhu.JPG

Dr Siva Balan RV
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/sivabalan.JPG

Dr Smruti Dilip Dabhole
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/smruthi.jpg

Dr Stephen R
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/stephen%20r.JPG

Dr Suganthi J
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/sugandhi.JPG

Dr Teena Jose
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/teena.JPG

Dr Thontadari C
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/thondadari.JPG

Dr Umamaheswari D
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/umamaheshwari.JPG

Dr Vinay M
https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/acf73d1ca844373010a44e652e991a7a9159e332/vinaym.JPG
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
