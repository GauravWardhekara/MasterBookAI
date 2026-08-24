const https = require('https');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const binDir = path.join(__dirname, '../resources/bin');
const targetFile = path.join(binDir, 'ollama.exe');
const zipFile = path.join(binDir, 'ollama.zip');
const url = 'https://github.com/ollama/ollama/releases/latest/download/ollama-windows-amd64.zip';

if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

if (fs.existsSync(targetFile)) {
  console.log('Ollama binary already exists at ' + targetFile);
  process.exit(0);
}

console.log('Downloading Ollama from ' + url);
const file = fs.createWriteStream(zipFile);

https.get(url, (response) => {
  if (response.statusCode === 302) {
    // Handle redirect
    https.get(response.headers.location, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        extractZip();
      });
    });
  } else {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      extractZip();
    });
  }
}).on('error', (err) => {
  fs.unlinkSync(zipFile);
  console.error('Error downloading:', err.message);
});

function extractZip() {
  console.log('Extracting ' + zipFile);
  try {
    const zip = new AdmZip(zipFile);
    zip.extractAllTo(binDir, true);
    fs.unlinkSync(zipFile);
    console.log('Successfully downloaded and extracted Ollama to ' + targetFile);
  } catch (err) {
    console.error('Extraction error:', err);
  }
}
