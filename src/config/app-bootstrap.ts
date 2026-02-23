import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppConfigService } from '../module/config/config.service';

export interface AppBootstrapOptions {
  /**
   * Whether to enable request logging middleware.
   * Default: true for production, false for tests.
   */
  enableRequestLogging?: boolean;

  /**
   * Whether to enable CORS.
   * Default: uses config, can be overridden for tests.
   */
  enableCors?: boolean;
}

/**
 * Shared app configuration used by both main.ts and integration tests.
 * Ensures consistent configuration across environments.
 */
export function configureApp(
  app: INestApplication,
  options: AppBootstrapOptions = {},
): { globalPrefix: string } {
  const { enableRequestLogging = false, enableCors } = options;

  // Get config service if available
  let globalPrefix = 'api';
  let corsConfig: { enabled: boolean; origin?: string | string[] } | undefined;

  try {
    const configSvc = app.get(AppConfigService);
    const config = configSvc.getConfig();
    if (config?.api?.path) {
      globalPrefix = config.api.path;
    }
    corsConfig = config?.api?.cors;
  } catch {
    // Config service not available (e.g., in minimal test setup)
    // Use defaults
  }

  // Set global prefix with exclusions for root-level endpoints (used by infra/load balancers)
  app.setGlobalPrefix(globalPrefix, {
    exclude: ['/', 'health'],
  });

  // Enable validation with transformation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS configuration
  const shouldEnableCors = enableCors ?? corsConfig?.enabled ?? false;
  if (shouldEnableCors && corsConfig) {
    app.enableCors(corsConfig);
  }

  // Request logging is typically only wanted in production, not tests
  if (enableRequestLogging) {
    // Note: Actual logging middleware stays in main.ts since it needs Express types
    // This flag just indicates intent - main.ts checks this if using configureApp
  }

  return { globalPrefix };
}
