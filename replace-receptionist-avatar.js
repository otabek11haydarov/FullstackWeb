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

        // Try to find the profile link inside header-actions
        const profileLink = $('.header-actions a[href="my-profile.html"]');
        if (profileLink.length > 0) {
            profileLink.replaceWith('<div class="userProfileTarget"></div>');
            changed = true;
        } else {
            // Try fallback: find a container with Anna Smith or just any link that looks like profile
            const links = $('a[href="my-profile.html"]');
            links.each(function() {
                const html = $(this).html();
                if (html.includes('headerInitial') || html.includes('Anna Smith') || html.includes('receptionistName')) {
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
