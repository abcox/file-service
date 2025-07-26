import * as path from 'path';
import * as fs from 'fs';

export const assets = 'assets';
export const dist = 'dist';

export const readAssetFile = (filename: string): string | undefined => {
  return readFile(filename, assets);
};

export const readFile = (
  filename: string,
  subfolder: string | undefined = assets,
): string | undefined => {
  try {
    const cssPath = path.join(dist, subfolder, filename);
    const css = fs.readFileSync(cssPath, 'utf8');
    return css;
  } catch (error) {
    console.warn(`Failed to read file ${filename}; ERROR: ${error}`);
  }
  return undefined;
};
