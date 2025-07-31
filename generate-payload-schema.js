import { execSync } from 'child_process';
import fs from 'fs';

console.log('Generating Payload schema...\n');

try {
  // Generate the Drizzle schema from Payload config
  console.log('1. Generating Drizzle schema from Payload config...');
  execSync('npx payload generate:db-schema', { stdio: 'inherit' });
  
  // Check if the schema file was created
  const schemaPath = './src/payload-generated-schema.ts';
  if (fs.existsSync(schemaPath)) {
    console.log('\n2. Schema generated successfully at:', schemaPath);
    console.log('\n3. You can now inspect the generated schema to see exactly what tables and columns Payload expects.');
    
    // Read and display a preview
    const content = fs.readFileSync(schemaPath, 'utf8');
    const userTableMatch = content.match(/export const users = pgTable\([^}]+\}/s);
    if (userTableMatch) {
      console.log('\n4. Users table schema preview:');
      console.log(userTableMatch[0]);
    }
  } else {
    console.log('\nSchema file not found at expected location.');
  }
} catch (error) {
  console.error('Error generating schema:', error.message);
  console.log('\nTip: Make sure you have all dependencies installed and the Payload config is valid.');
}