import * as path from 'path';
import * as fs from 'fs';

export const saveTestFile = (filename: string, content: string) => {
  fs.writeFileSync(path.join(__dirname, filename), content);
};

export const readTestFile = (filename: string) => {
  return fs.readFileSync(path.join(__dirname, filename), 'utf8');
};
