import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const facultiesDir = './public/assets/faculties';
const dataFile = './src/data/faculty.json';

const rawData = fs.readFileSync(dataFile, 'utf-8');
const facultyData = JSON.parse(rawData);

async function processImages() {
    for (let i = 0; i < facultyData.length; i++) {
        const faculty = facultyData[i];
        const oldImagePath = faculty.imagePath; // e.g. /assets/faculties/anusha.JPG
        const oldFileName = path.basename(oldImagePath);
        const oldFilePath = path.join(facultiesDir, oldFileName);
        
        let WebPName = oldFileName;
        const lastDot = WebPName.lastIndexOf('.');
        if (lastDot !== -1) {
             WebPName = WebPName.substring(0, lastDot) + '.webp';
        } else {
             WebPName += '.webp';
        }
        
        const newFilePath = path.join(facultiesDir, WebPName);
        
        if (fs.existsSync(oldFilePath)) {
            if (!fs.existsSync(newFilePath)) {
                console.log(`Processing ${oldFileName} -> ${WebPName}`);
                await sharp(oldFilePath)
                    .resize({ width: 800, withoutEnlargement: true })
                    .webp({ quality: 80 })
                    .toFile(newFilePath);
            } else {
                console.log(`Already compressed: ${WebPName}`);
            }
            faculty.imagePath = `/assets/faculties/${WebPName}`;
        } else {
            console.log(`File not found: ${oldFilePath}`);
        }
    }
    
    fs.writeFileSync(dataFile, JSON.stringify(facultyData, null, 4));
    console.log('Done updating faculty.json.');
}

processImages().catch(console.error);
