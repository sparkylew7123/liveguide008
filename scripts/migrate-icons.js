#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Mapping of lucide-react icons to heroicons
const iconMapping = {
  // Common icons
  'Mic': 'MicrophoneIcon',
  'MicOff': 'NoSymbolIcon',
  'Loader2': 'ArrowPathIcon',
  'Star': 'StarIcon',
  'Brain': 'CpuChipIcon',
  'Heart': 'HeartIcon',
  'Sparkles': 'SparklesIcon',
  'Play': 'PlayIcon',
  'Info': 'InformationCircleIcon',
  'Check': 'CheckIcon',
  'CheckCircle': 'CheckCircleIcon',
  'XCircle': 'XCircleIcon',
  'Users': 'UsersIcon',
  'Settings': 'Cog6ToothIcon',
  'ChevronRight': 'ChevronRightIcon',
  'Volume2': 'SpeakerWaveIcon',
  'ArrowLeft': 'ArrowLeftIcon',
  'Circle': 'EllipsisHorizontalCircleIcon',
  'Target': 'CrosshairIcon',
  
  // Additional mappings for inbox
  'Mail': 'EnvelopeIcon',
  'MailOpen': 'EnvelopeOpenIcon',
  'Archive': 'ArchiveBoxIcon',
  'Trash2': 'TrashIcon',
  'Pin': 'PinIcon',
  'PinOff': 'PinIcon',
  'Filter': 'FunnelIcon',
  'Search': 'MagnifyingGlassIcon',
  'Reply': 'ArrowUturnLeftIcon',
  'CheckCheck': 'CheckBadgeIcon',
  'Download': 'ArrowDownTrayIcon',
  'FileText': 'DocumentTextIcon',
  'AlertCircle': 'ExclamationCircleIcon',
  'Calendar': 'CalendarIcon',
  'Clock': 'ClockIcon',
  'Paperclip': 'PaperClipIcon',
  'MoreVertical': 'EllipsisVerticalIcon',
  
  // Onboarding flow icons
  'Dumbbell': 'BoltIcon',
  'Trophy': 'TrophyIcon',
  'Zap': 'BoltIcon',
  'Target': 'CrosshairIcon',
  'Rocket': 'RocketLaunchIcon',
  'Briefcase': 'BriefcaseIcon',
  'Smile': 'FaceSmileIcon',
  'Activity': 'ChartBarIcon',
  'Coffee': 'BeakerIcon',
  'Moon': 'MoonIcon',
  'Mountain': 'GlobeAltIcon',
  'Book': 'BookOpenIcon',
  'Home': 'HomeIcon',
  'Headphones': 'PlayIcon',
  'MessageSquare': 'ChatBubbleLeftRightIcon',
  'DollarSign': 'CurrencyDollarIcon',
  'TrendingUp': 'TrendingUpIcon',
  'Award': 'TrophyIcon',
  'Compass': 'MapIcon',
  'Palette': 'PaintBrushIcon',
  'Music': 'MusicalNoteIcon',
  'Camera': 'CameraIcon',
  'Film': 'FilmIcon',
  'Feather': 'PencilIcon',
  'Gamepad2': 'PuzzlePieceIcon',
  'Lightbulb': 'LightBulbIcon',
  'Shield': 'ShieldCheckIcon',
};

// Function to process a single file
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Check if file imports from lucide-react
  if (!content.includes('lucide-react')) {
    return { modified: false };
  }
  
  // Extract all lucide-react imports
  const importRegex = /import\s*{([^}]+)}\s*from\s*['"]lucide-react['"]/g;
  const matches = [...content.matchAll(importRegex)];
  
  if (matches.length === 0) {
    return { modified: false };
  }
  
  // Process each import statement
  matches.forEach(match => {
    const fullImport = match[0];
    const icons = match[1].split(',').map(icon => icon.trim());
    
    // Separate icons into outline and solid based on mapping
    const outlineIcons = [];
    const solidIcons = [];
    const unmappedIcons = [];
    
    icons.forEach(icon => {
      if (iconMapping[icon]) {
        // Most icons use outline variant by default
        outlineIcons.push(iconMapping[icon]);
      } else {
        unmappedIcons.push(icon);
      }
    });
    
    // Build new import statements
    let newImports = [];
    
    if (outlineIcons.length > 0) {
      newImports.push(`import { ${outlineIcons.join(', ')} } from '@heroicons/react/24/outline'`);
    }
    
    if (solidIcons.length > 0) {
      newImports.push(`import { ${solidIcons.join(', ')} } from '@heroicons/react/24/solid'`);
    }
    
    if (unmappedIcons.length > 0) {
      console.warn(`⚠️  Unmapped icons in ${filePath}: ${unmappedIcons.join(', ')}`);
      // Keep the original import for unmapped icons
      newImports.push(`import { ${unmappedIcons.join(', ')} } from 'lucide-react'`);
    }
    
    // Replace the import
    content = content.replace(fullImport, newImports.join(';\n'));
    
    // Update icon usage in JSX - add size class
    icons.forEach(icon => {
      if (iconMapping[icon]) {
        // Replace icon usage, ensuring proper size
        const regex = new RegExp(`<${icon}(\\s|>|/)`, 'g');
        content = content.replace(regex, `<${iconMapping[icon]} className="h-5 w-5"$1`);
      }
    });
    
    modified = true;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  
  return { modified, unmappedIcons: [] };
}

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

// Main function
function main() {
  console.log('🔄 Starting icon migration from lucide-react to @heroicons/react...\n');
  
  // Find all TypeScript/JavaScript files
  const files = findFiles('src', /\.(tsx?|jsx?)$/);
  
  console.log(`Found ${files.length} files to process...\n`);
  
  let modifiedCount = 0;
  const unmappedIconsList = new Set();
  
  files.forEach(file => {
    const result = processFile(file);
    if (result.modified) {
      console.log(`✅ Updated: ${file}`);
      modifiedCount++;
    }
    result.unmappedIcons?.forEach(icon => unmappedIconsList.add(icon));
  });
  
  console.log(`\n✨ Migration complete!`);
  console.log(`📝 Modified ${modifiedCount} files`);
  
  if (unmappedIconsList.size > 0) {
    console.log(`\n⚠️  Unmapped icons found:`);
    unmappedIconsList.forEach(icon => console.log(`   - ${icon}`));
    console.log('\nThese icons still use lucide-react. Please map them manually.');
  }
  
  console.log('\n📌 Next steps:');
  console.log('1. Review the changes');
  console.log('2. Test the application');
  console.log('3. Run: npm uninstall lucide-react');
}

// Run the migration
main();