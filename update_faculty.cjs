const fs = require('fs');

const userList = `
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
