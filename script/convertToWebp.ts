import sharp from 'sharp';
import { readdir } from 'fs/promises';
import { join, resolve } from 'path';

async function encodeEmojis() {
  const files = await readdir(resolve(__dirname, '../png/160'));

  console.log("converting files...");

  const imageWrites = files.map(file => () => {
    return sharp(resolve(__dirname, '../png/160', file), {
      failOn: 'warning'
    })
        .on('error', error => { 
          console.log("GOT ERROR CONVERTING " + file)
          throw error        
         })
         .png({
            palette: true,
            compressionLevel: 9
         })
        .webp({ 
          // nearLossless:true,quality:50
          lossless: true, 
          preset: 'icon' 
        })
        .toFile(resolve(__dirname, '../webp', file.replace('.png', '.webp')))
        .catch(error => {
          console.log("Error for file '" + file + "'");
          console.error(error)
          console.trace(error)
          process.exit(1)
        })
    })

    await Promise.all(imageWrites.map(img => img()))
}


encodeEmojis().then(() => console.log("Webp conversion done."))
