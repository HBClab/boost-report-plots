import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const sourceFile = path.resolve(rootDir, '..', '..', 'data', 'zone_out.csv');
const targetDir = path.resolve(rootDir, 'public', 'data');
const targetFile = path.resolve(targetDir, 'zone_out.csv');

if (!fs.existsSync(sourceFile)) {
  throw new Error(`HR CSV source file not found: ${sourceFile}`);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(sourceFile, targetFile);

console.log(`[sync-hr-data] copied ${sourceFile} -> ${targetFile}`);
