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

    // 1. Inject CDNs into head
    if (!content.includes('unpkg.com/tippy.js')) {
        $('head').append(`
  <script src="https://unpkg.com/@popperjs/core@2"></script>
  <script src="https://unpkg.com/tippy.js@6"></script>
  <link rel="stylesheet" href="https://unpkg.com/tippy.js@6/animations/scale-subtle.css"/>
`);
        changed = true;
    }

    // 2. Doctor/General: Find .user-avatar and its parent if it's an <a> link
    $('.user-avatar').each(function() {
        const parentA = $(this).parent('a');
        if (parentA.length > 0) {
            parentA.replaceWith('<div class="userProfileTarget"></div>');
        } else {
            $(this).replaceWith('<div class="userProfileTarget"></div>');
        }
        changed = true;
    });

    // 3. Admin/Receptionist: Find .sidebar-footer containing .avatar
    $('.sidebar-footer').each(function() {
        const flexContainer = $(this).find('.d-flex.align-items-center');
        if (flexContainer.length > 0 && flexContainer.find('.avatar').length > 0) {
            flexContainer.replaceWith('<div class="userProfileTarget"></div>');
            changed = true;
        }
    });

    if (changed) {
        fs.writeFileSync(filePath, $.html(), 'utf8');
        console.log(`Updated HTML: ${filePath}`);
    }
}

walkDir(frontendDir, (filePath) => {
    if (filePath.endsWith('.html')) {
        processHtmlFile(filePath);
    }
});

console.log("Avatar refactoring complete.");
