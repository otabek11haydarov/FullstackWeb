const fs = require('fs');
const path = require('path');

function processDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // 1. Inject Backdrop right before <div class="sidebar..." or <aside class="sidebar..."
            if (!content.includes('class="sidebar-backdrop"')) {
                content = content.replace(/(<(div|aside)\s+class="[^"]*sidebar[^"]*"[^>]*>)/, '<div class="sidebar-backdrop" id="sidebarBackdrop"></div>\n    $1');
                modified = true;
            }

            // 2. Inject mobile toggle button at the beginning of main-content
            if (!content.includes('id="mobileSidebarToggle"')) {
                content = content.replace(/(<main class="main-content[^"]*"[^>]*>)/, '$1\n      <button id="mobileSidebarToggle" class="btn btn-outline-info d-lg-none mb-3" style="border-radius: 8px; width: fit-content;"><i class="fas fa-bars me-2"></i> Menu</button>');
                modified = true;
            }
            
            // 3. Inject mobile close button inside the sidebar
            if (!content.includes('id="mobileCloseSidebar"')) {
                content = content.replace(/(<(div|aside)\s+class="[^"]*sidebar[^"]*"[^>]*>)/, '$1\n        <button class="btn text-white mobile-close-btn d-lg-none" id="mobileCloseSidebar" style="position: absolute; top: 15px; right: 15px; background: transparent; border: none; font-size: 1.5rem; z-index: 1060;"><i class="fas fa-times"></i></button>');
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    });
}

processDir(path.join(__dirname, 'frontend'));
