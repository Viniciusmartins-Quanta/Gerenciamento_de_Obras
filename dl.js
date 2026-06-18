import https from 'https';
import fs from 'fs';

const fileId = '1EzVNByqEjKaDt743_VvPodzk_ddCNFmT';
const dest = './src/assets/images/timbrado.jpg';

function downloadFile() {
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
  
  https.get(url, (res) => {
    if (res.statusCode === 302 || res.statusCode === 303) {
      let redirectUrl = res.headers.location;
      https.get(redirectUrl, (response) => {
        const cookies = response.headers['set-cookie'];
        let token = '';
        if (cookies) {
           for(let cookie of cookies) {
               if (cookie.startsWith('download_warning')) {
                   token = cookie.split('=')[1].split(';')[0];
                   break;
               }
           }
        }
        if (token) {
           const finalUrl = `https://drive.google.com/uc?export=download&confirm=${token}&id=${fileId}`;
           const file = fs.createWriteStream(dest);
           https.get(finalUrl, (finalRes) => {
               finalRes.pipe(file);
               file.on('finish', () => {
                   file.close();
                   console.log('Download completed');
               });
           });
        } else {
             // maybe it just redirects again to download?
             console.log("No token, direct download.");
             const file = fs.createWriteStream(dest);
             response.pipe(file);
             file.on('finish', () => {
                 file.close();
             });
        }
      });
    } else {
       const file = fs.createWriteStream(dest);
       res.pipe(file);
       file.on('finish', () => {
         file.close();
         console.log('Download completed directly');
       })
    }
  }).on('error', (err) => {
    console.error(err);
  });
}

downloadFile();
