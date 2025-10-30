import * as fs from 'fs';
import * as path from 'path';
import { parse, type ConlluDocument } from './conllu.js';
import {
  conlluToTurtle,
  extractMetadata,
  type DocumentMetadata,
} from './ttl.js';

/**
 * Convert CONLL-U file to Turtle format
 */
function convertConlluToTurtle(inputPath: string, outputPath: string): void {
  console.log(`Reading CONLL-U file: ${inputPath}`);
  const conlluContent = fs.readFileSync(inputPath, 'utf-8');

  console.log('Parsing CONLL-U...');
  const document: ConlluDocument = parse(conlluContent);

  console.log('Extracting metadata...');
  const metadata = extractMetadata(document);

  console.log('Converting to Turtle format...');
  const turtleContent = conlluToTurtle(document, metadata);

  console.log(`Writing Turtle file: ${outputPath}`);
  fs.writeFileSync(outputPath, turtleContent, 'utf-8');

  console.log('Conversion completed successfully!');
}

// CLI execution
function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: tsx conllu-to-ttl.ts <input.conllu> <output.ttl>');
    process.exit(1);
  }

  const inputPath = path.resolve(args[0]);
  const outputPath = path.resolve(args[1]);

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file does not exist: ${inputPath}`);
    process.exit(1);
  }

  try {
    convertConlluToTurtle(inputPath, outputPath);
  } catch (error) {
    console.error('Error during conversion:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { convertConlluToTurtle };


