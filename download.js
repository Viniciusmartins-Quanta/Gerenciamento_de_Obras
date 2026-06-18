import fs from 'fs';
fetch('https://drive.google.com/uc?export=download&id=1EzVNByqEjKaDt743_VvPodzk_ddCNFmT')
  .then(res => res.arrayBuffer())
  .then(buffer => {
    fs.writeFileSync('./src/assets/images/timbrado.jpg', Buffer.from(buffer));
    console.log("Image downloaded successfully!");
  })
  .catch(err => {
    console.error("Error downloading image:", err);
  });
