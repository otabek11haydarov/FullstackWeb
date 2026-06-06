const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const frontendDir = path.join(__dirname, 'frontend');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

function processHtmlFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(content, { decodeEntities: false, recognizeSelfClosing: true });
    let changed = false;

    if (!content.includes('toastify.min.css')) {
        $('head').append('<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css">');
        changed = true;
    }

    if (!content.includes('toastify-js')) {
        $('body').append('<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/toastify-js"></script>');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, $.html(), 'utf8');
        console.log(`Updated Toastify CDNs: ${filePath}`);
    }
}

walkDir(frontendDir, (filePath) => {
    if (filePath.endsWith('.html')) {
        processHtmlFile(filePath);
    }
});

console.log("Toastify CDN injection verification complete.");
