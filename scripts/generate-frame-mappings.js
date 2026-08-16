/**
 * Frame Mapping Generator
 * 
 * This script automatically scans the assets/frames directory and generates:
 * 1. frames.json - Frame metadata
 * 2. Frame require mappings for frameService.ts
 * 
 * Run this script whenever you add new frames:
 * node scripts/generate-frame-mappings.js
 */

const fs = require('fs');
const path = require('path');

const FRAMES_DIR = path.join(__dirname, '../assets/frames');
const FRAMES_JSON_PATH = path.join(FRAMES_DIR, 'frames.json');

// Category display names
const CATEGORY_NAMES = {
  birthday: 'Birthday Party',
  wedding: 'Wedding',
  corporate: 'Corporate Event',
  halloween: 'Halloween Party',
  christmas: 'Christmas',
  graduation: 'Graduation',
  anniversary: 'Anniversary',
};

// Category descriptions
const CATEGORY_DESCRIPTIONS = {
  birthday: 'Fun birthday-themed frames',
  wedding: 'Elegant wedding frames',
  corporate: 'Professional corporate frames',
  halloween: 'Spooky Halloween frames',
  christmas: 'Festive Christmas frames',
  graduation: 'Graduation ceremony frames',
  anniversary: 'Anniversary celebration frames',
};

/**
 * Scan frames directory and discover all frames
 */
function discoverFrames() {
  const categories = [];

  // Read all directories in frames folder
  const items = fs.readdirSync(FRAMES_DIR, { withFileTypes: true });

  for (const item of items) {
    // Skip non-directories and special files
    if (!item.isDirectory() || item.name.startsWith('.')) {
      continue;
    }

    const categoryId = item.name;
    const categoryPath = path.join(FRAMES_DIR, categoryId);

    // Find all PNG files in this category
    const files = fs.readdirSync(categoryPath);
    const pngFiles = files.filter(file => 
      file.toLowerCase().endsWith('.png') && !file.startsWith('.')
    ).sort();

    if (pngFiles.length === 0) {
      console.log(`⚠️  Category "${categoryId}" has no PNG files, skipping...`);
      continue;
    }

    // Create frame entries
    const frames = pngFiles.map((file, index) => {
      const frameName = file.replace('.png', '');
      return {
        id: `${categoryId}_${index + 1}`,
        name: formatFrameName(frameName),
        file: `${categoryId}/${file}`,
      };
    });

    // Create category entry
    categories.push({
      id: categoryId,
      title: CATEGORY_NAMES[categoryId] || formatCategoryName(categoryId),
      description: CATEGORY_DESCRIPTIONS[categoryId] || `${formatCategoryName(categoryId)} frames`,
      frames: frames,
    });

    console.log(`✓ Found ${frames.length} frame(s) in "${categoryId}"`);
  }

  return categories;
}

/**
 * Format frame name for display
 */
function formatFrameName(name) {
  // Convert "frame1" or "birthday-balloons" to "Frame 1" or "Birthday Balloons"
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/^Frame\s+(\d+)$/i, 'Frame $1');
}

/**
 * Format category name for display
 */
function formatCategoryName(name) {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Generate frames.json
 */
function generateFramesJson(categories) {
  const data = {
    _generated: new Date().toISOString(),
    _note: 'This file is auto-generated. Run: node scripts/generate-frame-mappings.js',
    categories: categories,
  };

  fs.writeFileSync(
    FRAMES_JSON_PATH,
    JSON.stringify(data, null, 2),
    'utf8'
  );

  console.log(`\n✓ Generated frames.json with ${categories.length} categories`);
}

/**
 * Generate TypeScript require mappings
 */
function generateFrameServiceCode(categories) {
  const lines = [];

  // Collect all frame files
  const allFrames = [];
  for (const category of categories) {
    for (const frame of category.frames) {
      allFrames.push(frame.file);
    }
  }

  lines.push('    // Auto-generated frame mappings');
  lines.push('    // To regenerate: node scripts/generate-frame-mappings.js');
  lines.push('    switch (framePath) {');

  // Group by category for readability
  for (const category of categories) {
    lines.push('');
    lines.push(`      // ${category.title}`);
    for (const frame of category.frames) {
      lines.push(`      case '${frame.file}':`);
      lines.push(`        return require('../assets/frames/${frame.file}');`);
    }
  }

  lines.push('');
  lines.push('      default:');
  lines.push("        console.warn(`Frame not found: ${framePath}`);");
  lines.push('        return null;');
  lines.push('    }');

  return lines.join('\n');
}

/**
 * Update frameService.ts with new mappings
 */
function updateFrameService(categories) {
  const serviceFile = path.join(__dirname, '../services/frameService.ts');
  let content = fs.readFileSync(serviceFile, 'utf8');

  const newMappings = generateFrameServiceCode(categories);

  // Replace the switch statement in getFrameSource method
  const switchRegex = /\/\/\s*Auto-generated frame mappings[\s\S]*?default:[\s\S]*?return null;\s*}/;
  
  if (switchRegex.test(content)) {
    content = content.replace(switchRegex, newMappings);
  } else {
    // Try to find the switch statement without the auto-generated comment
    const fallbackRegex = /switch\s*\(framePath\)\s*\{[\s\S]*?default:[\s\S]*?return null;\s*}/;
    if (fallbackRegex.test(content)) {
      content = content.replace(fallbackRegex, newMappings);
    } else {
      console.error('❌ Could not find switch statement in frameService.ts');
      console.log('Please update frameService.ts manually or restore the original template.');
      return false;
    }
  }

  fs.writeFileSync(serviceFile, content, 'utf8');
  console.log('✓ Updated frameService.ts with new mappings');
  return true;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Scanning frames directory...\n');

  // Discover all frames
  const categories = discoverFrames();

  if (categories.length === 0) {
    console.log('\n⚠️  No frame categories found!');
    console.log('Add PNG files to folders in assets/frames/');
    return;
  }

  console.log(`\n✓ Found ${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}`);

  // Generate files
  generateFramesJson(categories);
  updateFrameService(categories);

  console.log('\n✅ Frame mappings generated successfully!');
  console.log('\nNext steps:');
  console.log('1. Check frames.json and frameService.ts');
  console.log('2. Test the app with: npm start');
  console.log('3. Add more frames by dropping PNG files in category folders');
  console.log('4. Run this script again: node scripts/generate-frame-mappings.js\n');
}

// Run the script
main();

