const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend/doctor');
const files = ['dashboard.html', 'my-patients.html', 'diagnoses.html', 'patient-profile.html'];

const insertLink = `        <a href="my-schedule.html" class="nav-item">
          <i class="fa-regular fa-calendar-days"></i> My Schedule
        </a>
`;

files.forEach(file => {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find Reports link
  const target = `        <a href="#" class="nav-item">
          <i class="fa-regular fa-file-lines"></i> Reports
        </a>`;
        
  if (content.includes(target) && !content.includes('my-schedule.html')) {
    content = content.replace(target, insertLink + target);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated sidebar in ${file}`);
  } else {
    console.log(`Could not update ${file}`);
  }
});
