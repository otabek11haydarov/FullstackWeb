const fs = require('fs');
const path = require('path');

const doctorDir = path.join(__dirname, 'frontend/doctor');
const files = fs.readdirSync(doctorDir).filter(f => f.endsWith('.html'));
const styleFile = path.join(doctorDir, 'style.css');

let unifiedCSS = '';
const styleRegex = /<style>([\s\S]*?)<\/style>/i;

files.forEach(file => {
  const filePath = path.join(doctorDir, file);
  let html = fs.readFileSync(filePath, 'utf8');

  // 1. Extract style block
  const match = html.match(styleRegex);
  if (match) {
    // We only need to grab the full style block once for dashboard since it's comprehensive
    if (file === 'dashboard.html') {
      unifiedCSS = match[1].trim();
      
      // The prompt specifically asks to take :root and body background.
      // But actually, we just take the whole style block from dashboard and put it in style.css!
      // Wait, let's remove color: #fff; and min-height: 100vh; from body rule inside the CSS
      unifiedCSS = unifiedCSS.replace(/color:\s*#fff;/gi, '');
      unifiedCSS = unifiedCSS.replace(/min-height:\s*100vh;/gi, '');
    }
    
    // 2. Remove style block from HTML
    html = html.replace(styleRegex, '');
  }

  // 3. Ensure <link rel="stylesheet" href="style.css"> is present
  if (!html.includes('href="style.css"')) {
    html = html.replace('</head>', '  <link rel="stylesheet" href="style.css">\n</head>');
  }

  // 4. Replace <body> with <body class="text-white min-vh-100">
  // Some files might have `<body class="...">` or `<body>`
  html = html.replace(/<body[^>]*>/i, '<body class="text-white min-vh-100">');

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`Cleaned ${file}`);
});

// Write unified CSS to style.css
// Prepend or overwrite? Let's check if style.css exists
let existingCss = '';
if (fs.existsSync(styleFile)) {
  existingCss = fs.readFileSync(styleFile, 'utf8');
}

if (!existingCss.includes('--neon-cyan')) {
  fs.writeFileSync(styleFile, unifiedCSS + '\n' + existingCss, 'utf8');
  console.log('Updated style.css with extracted styles!');
} else {
  console.log('style.css already has the extracted styles!');
}
