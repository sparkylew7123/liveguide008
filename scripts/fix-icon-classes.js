#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to find all files recursively
function findFiles(dir, pattern, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!item.startsWith('.') && item !== 'node_modules') {
        findFiles(fullPath, pattern, files);
      }
    } else if (stat.isFile() && pattern.test(fullPath)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Fix duplicate className attributes
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Pattern to match icon components with duplicate className
  // e.g., <MicrophoneIcon className="h-5 w-5" className="h-4 w-4" />
  const duplicateClassRegex = /(<\w+Icon\s+)className="h-5 w-5"(\s+[^>]*?)className="([^"]+)"/g;
  
  content = content.replace(duplicateClassRegex, (match, prefix, middle, existingClass) => {
    modified = true;
    // Keep the existing className, not the auto-added one
    return `${prefix}${middle}className="${existingClass}"`;
  });
  
  // Also fix cases where the icon had no className before
  // Remove the auto-added className if the icon is used without any props
  const unnecessaryClassRegex = /(<\w+Icon)\s+className="h-5 w-5"(\s*\/>)/g;
  content = content.replace(unnecessaryClassRegex, (match, prefix, suffix) => {
    modified = true;
    return `${prefix}${suffix}`;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  
  return false;
}

// Main function
function main() {
  console.log('🔧 Fixing icon className attributes...\n');
  
  const files = findFiles('src', /\.(tsx?|jsx?)$/);
  let fixedCount = 0;
  
  files.forEach(file => {
    if (fixFile(file)) {
      console.log(`✅ Fixed: ${file}`);
      fixedCount++;
    }
  });
  
  console.log(`\n✨ Fixed ${fixedCount} files`);
}

// Run the fix
main();