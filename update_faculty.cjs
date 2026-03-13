const fs = require('fs');

const userList = `
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
`.trim();

const urlMappings = [];
const lines = userList.split('\n').filter(l => l.trim().length > 0);
for (let i = 0; i < lines.length; i += 2) {
    urlMappings.push({
        name: lines[i].trim(),
        url: lines[i+1].trim()
    });
}

function normalizeName(name) {
    return name.toLowerCase().replace(/[^a-z]/g, '');
}

function processJson(filePath) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // update existing names
    for (const item of data) {
        const itemNorm = normalizeName(item.name);
        for (const mapping of urlMappings) {
            const mapNorm = normalizeName(mapping.name);
            if (itemNorm.includes(mapNorm) || mapNorm.includes(itemNorm) || mapNorm.replace('dsouza','dsouza') === itemNorm) {
                item.imagePath = mapping.url;
                break;
            }
        }
    }
    
    // identify new names that weren't in JSON
    for (const mapping of urlMappings) {
        const mapNorm = normalizeName(mapping.name);
        let found = false;
        for (const item of data) {
            const itemNorm = normalizeName(item.name);
            if (itemNorm.includes(mapNorm) || mapNorm.includes(itemNorm)) {
                found = true;
                break;
            }
        }
        if (!found) {
            console.log("Missing from " + filePath + ": " + mapping.name);
            data.push({
                "name": mapping.name,
                "designation": "Faculty",
                "imagePath": mapping.url,
                "bio": []
            });
        }
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
    console.log("Updated " + filePath);
}

processJson('d:/csbyc-blog/src/data/faculty.json');
processJson('d:/csbyc-blog/src/data/faculty_raw.json');
