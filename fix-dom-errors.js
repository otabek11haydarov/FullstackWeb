const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, 'frontend');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

function processJsFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let changed = false;

    const filteredLines = lines.filter(line => {
        if (line.match(/(userNameDisplay|userInitial|userRoleDisplay|headerInitialEl|avatar|profileAvatar)\.textContent\s*=/)) {
            changed = true;
            return false; // delete this line
        }
        return true;
    });

    if (changed) {
        fs.writeFileSync(filePath, filteredLines.join('\n'), 'utf8');
        console.log(`Fixed DOM errors in: ${filePath}`);
    }
}

walkDir(frontendDir, (filePath) => {
    if (filePath.endsWith('.js')) {
        processJsFile(filePath);
    }
});

console.log("DOM error fix complete.");
