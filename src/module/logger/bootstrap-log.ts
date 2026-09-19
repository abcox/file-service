import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const STARTUP_LOG_PATH =
  process.env.FILE_SERVICE_STARTUP_LOG_PATH ||
  path.join(
    process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'),
    'Vorba',
    'FileService',
    'logs',
    'app-startup.log',
  );

function writeStartupLog(message: string): void {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;

  try {
    fs.mkdirSync(path.dirname(STARTUP_LOG_PATH), { recursive: true });
    fs.appendFileSync(STARTUP_LOG_PATH, line, { encoding: 'utf8' });
  } catch {
    // Ignore file write errors so early startup diagnostics never block boot.
  }
}

export function bootstrapLog(message: string): void {
  console.log(message);
  writeStartupLog(message);
}

export function bootstrapError(message: string, error?: Error): void {
  console.error(message);
  writeStartupLog(message);

  if (error) {
    writeStartupLog(error.message);

    if (error.stack) {
      writeStartupLog(error.stack);
    }
  }
}
