import * as path from 'path';
import * as fs from 'fs';

export const assets = 'assets';
export const dist = 'dist';

// assets subfolders:
export const PDF_TEMPLATE = 'pdf/template';

export const readPdfTemplate = (filename: string): string | undefined => {
  return readAssetFile(filename, PDF_TEMPLATE);
};

export const readAssetFile = (
  filename: string,
  subfolder: string | null = null,
): string | undefined => {
  // Use src folder in development, dist folder in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const baseFolder = isDevelopment ? 'src' : dist;

  const assetPath = subfolder
    ? path.join(baseFolder, assets, subfolder)
    : path.join(baseFolder, assets);
  return readFile(filename, assetPath);
};

export const readFile = (
  filename: string,
  subfolder: string | undefined = assets,
): string | undefined => {
  let filePath: string | undefined;
  try {
    filePath = path.join(subfolder, filename);
    console.log('filePath', filePath);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return fileContent;
  } catch (error) {
    console.warn(`Failed to read file ${filePath}; ERROR: ${error}`);
  }
  return undefined;
};
