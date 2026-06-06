const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const receptionistDir = path.join(__dirname, 'frontend', 'receptionist');

fs.readdirSync(receptionistDir).forEach(file => {
    if (file.endsWith('.html')) {
        const filePath = path.join(receptionistDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        const $ = cheerio.load(content, { decodeEntities: false, recognizeSelfClosing: true });
        let changed = false;

        const links = $('.header-actions a');
        links.each(function() {
            const html = $(this).html();
            if (html.includes('headerInitial') || html.includes('receptionistName') || html.includes('Anna Smith')) {
                $(this).replaceWith('<div class="userProfileTarget"></div>');
                changed = true;
            }
        });

        // Some might not be inside .header-actions but are `a` tags
        if (!changed) {
            $('a').each(function() {
                const html = $(this).html();
                if (html.includes('headerInitial') || html.includes('receptionistName') || html.includes('Anna Smith')) {
                    $(this).replaceWith('<div class="userProfileTarget"></div>');
                    changed = true;
                }
            });
        }

        if (changed) {
            fs.writeFileSync(filePath, $.html(), 'utf8');
            console.log(`Updated Receptionist Avatar in: ${file}`);
        }
    }
});

console.log("Receptionist avatar replacement complete.");
