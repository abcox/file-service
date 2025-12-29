import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export interface TemplateRenderRequest {
  templateName: string;
  baseData?: Record<string, any>;
  personalizationData?: Record<string, any>;
  contextData?: Record<string, any>;
  minify?: boolean;
}

export interface TemplateRenderResult {
  html: string;
  success: boolean;
  error?: string;
  templateUsed: string;
  dataLayers: string[];
}

export const PREVIEW_FILE_EXTENSION = 'html';
export const SAMPLE_JSON_FILE_EXTENSION = 'json';

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);
  private templateCache = new Map<string, Handlebars.TemplateDelegate>();
  private readonly assetsBasePath: string;
  private readonly templateFileNameSuffix = '.hbs';

  constructor() {
    this.assetsBasePath = path.resolve(
      process.cwd(),
      'src',
      'assets',
      'content',
      'email',
      'poc',
    );
    this.registerHelpers();
  }

  /**
   * Render template with multi-layer personalization
   */
  renderTemplate(request: TemplateRenderRequest): TemplateRenderResult {
    try {
      const {
        templateName,
        baseData,
        personalizationData,
        contextData,
        minify = true,
      } = request;

      let html = '';
      let templateUsed = templateName;
      let dataLayers: string[] = [];

      // Try to load and compile Handlebars template
      let template: Handlebars.TemplateDelegate | null = null;
      try {
        template = this.getCompiledTemplate(templateName);
      } catch {
        // If .hbs template not found, fallback to static HTML file
        this.logger.warn(
          `No .hbs template found for '${templateName}', falling back to static HTML file if available.`,
        );
      }

      if (template) {
        // Merge data layers (order matters: base < personalization < context)
        const mergedData = this.mergeDataLayers(
          baseData,
          personalizationData,
          contextData,
        );
        // Render template
        const rawHtml = template(mergedData);
        // Normalize line endings for web compatibility
        const normalizedHtml = this.normalizeLineEndings(rawHtml);
        // Conditionally minify HTML based on minify parameter
        html = minify ? this.minifyHtml(normalizedHtml) : normalizedHtml;
        dataLayers = this.getDataLayerNames(
          baseData,
          personalizationData,
          contextData,
        );
      } else {
        // Fallback: try to load static HTML file (preview file)
        html = this.getSampleHtml(templateName) || '';
        if (!html) {
          throw new Error(
            `Neither .hbs nor .html file found for template: ${templateName}`,
          );
        }
        // Optionally minify static HTML if requested
        html = minify ? this.minifyHtml(html) : this.normalizeLineEndings(html);
        dataLayers = [];
        templateUsed = `${templateName} (static HTML)`;
      }

      return {
        html,
        success: true,
        templateUsed,
        dataLayers,
      };
    } catch (error) {
      this.logger.error(
        `Failed to render template ${request.templateName}`,
        error,
      );
      return {
        html: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        templateUsed: request.templateName,
        dataLayers: [],
      };
    }
  }

  /**
   * Render template with just template name and simple data (convenience method)
   */
  renderSimpleTemplate(
    templateName: string,
    data?: Record<string, any>,
  ): string {
    const result = this.renderTemplate({
      templateName,
      baseData: data,
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.html;
  }

  /**
   * Get compiled template (with caching)
   */
  private getCompiledTemplate(
    templateName: string,
  ): Handlebars.TemplateDelegate {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    const templatePath = this.getTemplatePath(templateName);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`);
    }

    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const compiledTemplate = Handlebars.compile(templateSource);

    // Cache compiled template
    this.templateCache.set(templateName, compiledTemplate);

    return compiledTemplate;
  }

  /**
   * Get template file path - supports subfolder structure
   */
  private getTemplatePath(templateName: string): string {
    // Support both with and without .hbs extension
    const baseName = templateName.endsWith(this.templateFileNameSuffix)
      ? templateName.replace(this.templateFileNameSuffix, '')
      : templateName;

    // Try direct path first (e.g., "folder/template.hbs")
    let templatePath = path.join(
      this.assetsBasePath,
      `${baseName}${this.templateFileNameSuffix}`,
    );
    if (fs.existsSync(templatePath)) {
      return templatePath;
    }

    // Try folder structure where folder name matches template name (e.g., "vorba-intro-3" -> "vorba-intro-3/vorba-intro-3.hbs")
    templatePath = path.join(
      this.assetsBasePath,
      baseName,
      `${baseName}${this.templateFileNameSuffix}`,
    );
    if (fs.existsSync(templatePath)) {
      return templatePath;
    }

    // Fallback to original path (for backward compatibility)
    return path.join(
      this.assetsBasePath,
      `${baseName}${this.templateFileNameSuffix}`,
    );
  }

  /**
   * Merge data layers with proper precedence
   */
  private mergeDataLayers(
    baseData?: Record<string, any>,
    personalizationData?: Record<string, any>,
    contextData?: Record<string, any>,
  ): Record<string, any> {
    return {
      ...baseData,
      ...personalizationData,
      ...contextData,
    };
  }

  /**
   * Normalize line endings for web compatibility (convert CRLF to LF)
   */
  private normalizeLineEndings(html: string): string {
    return html.replace(/\r\n/g, '\n');
  }

  /**
   * Minify HTML by removing excessive whitespace and normalizing line endings
   */
  private minifyHtml(html: string): string {
    return (
      html
        // Remove Windows line endings and replace with single spaces
        .replace(/\r\n/g, ' ')
        // Remove excessive whitespace between tags
        .replace(/>\s+</g, '><')
        // Remove leading/trailing whitespace on lines
        .replace(/\s+/g, ' ')
        // Remove whitespace around common HTML structures
        .replace(/\s*(<\/?(table|tr|td|body|html|head|title)[^>]*>)\s*/gi, '$1')
        // Clean up final result
        .trim()
    );
  }

  /**
   * Get names of active data layers for debugging
   */
  private getDataLayerNames(
    baseData?: Record<string, any>,
    personalizationData?: Record<string, any>,
    contextData?: Record<string, any>,
  ): string[] {
    const layers: string[] = [];
    if (baseData && Object.keys(baseData).length > 0) layers.push('base');
    if (personalizationData && Object.keys(personalizationData).length > 0)
      layers.push('personalization');
    if (contextData && Object.keys(contextData).length > 0)
      layers.push('context');
    return layers;
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHelpers(): void {
    // Date formatting helper
    Handlebars.registerHelper(
      'formatDate',
      (date: Date | string, format?: string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (format === 'short') {
          return d.toLocaleDateString();
        }
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      },
    );

    // Uppercase helper
    Handlebars.registerHelper('upper', (str: string) => {
      return str ? str.toUpperCase() : '';
    });

    // Conditional helper for personalization
    Handlebars.registerHelper(
      'ifPersonalized',
      function (value: unknown, options: Handlebars.HelperOptions) {
        if (value && value !== '') {
          return options.fn(this);
        }
        return options.inverse(this);
      },
    );

    // Default value helper
    Handlebars.registerHelper(
      'default',
      (value: unknown, defaultValue: unknown): unknown => {
        return value || defaultValue;
      },
    );
  }

  /**
   * Clear template cache (useful for development)
   */
  clearCache(): void {
    this.templateCache.clear();
    this.logger.log('Template cache cleared');
  }

  /**
   * Get available templates (simplified) - supports subfolder organization
   */
  getAvailableTemplates(): Array<{
    name: string;
    previewUrl?: string;
    htmlOnly?: boolean;
  }> {
    try {
      return this.discoverTemplatesRecursively(this.assetsBasePath, '');
    } catch (error) {
      this.logger.error('Failed to read templates directory', error);
      return [];
    }
  }

  /**
   * Recursively discover templates in folders and subfolders
   */
  private discoverTemplatesRecursively(
    currentPath: string,
    relativePath: string,
  ): Array<{
    name: string;
    previewUrl?: string;
    htmlOnly?: boolean;
  }> {
    const templates: Array<{
      name: string;
      previewUrl?: string;
      htmlOnly?: boolean;
    }> = [];

    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      const hbsNames = new Set<string>();
      const htmlNames = new Set<string>();

      // First pass: collect .hbs and .html base names
      for (const entry of entries) {
        if (entry.isFile()) {
          if (entry.name.endsWith(this.templateFileNameSuffix)) {
            hbsNames.add(entry.name.replace(this.templateFileNameSuffix, ''));
          } else if (entry.name.endsWith('.html')) {
            htmlNames.add(entry.name.replace(/\.html$/, ''));
          }
        }
      }

      // Second pass: process directories and .hbs templates
      for (const entry of entries) {
        if (entry.isDirectory()) {
          // Recursively search subdirectories
          const subPath = path.join(currentPath, entry.name);
          const newRelativePath = relativePath
            ? `${relativePath}/${entry.name}`
            : entry.name;
          const subTemplates = this.discoverTemplatesRecursively(
            subPath,
            newRelativePath,
          );
          templates.push(...subTemplates);
        } else if (
          entry.isFile() &&
          entry.name.endsWith(this.templateFileNameSuffix)
        ) {
          const baseName = entry.name.replace(this.templateFileNameSuffix, '');
          let templateName: string;
          if (relativePath) {
            const folderName = path.basename(relativePath);
            templateName =
              folderName === baseName
                ? folderName
                : `${relativePath}/${baseName}`;
          } else {
            templateName = baseName;
          }
          const samplePath = path.join(currentPath, `${baseName}.html`);
          const hasSample = fs.existsSync(samplePath);
          templates.push({
            name: templateName,
            previewUrl: hasSample
              ? `/email-template/${encodeURIComponent(templateName)}/preview`
              : undefined,
            htmlOnly: false,
          });
        }
      }

      // Third pass: add .html-only templates (no .hbs)
      for (const htmlName of htmlNames) {
        if (!hbsNames.has(htmlName)) {
          let templateName: string;
          if (relativePath) {
            const folderName = path.basename(relativePath);
            templateName =
              folderName === htmlName
                ? folderName
                : `${relativePath}/${htmlName}`;
          } else {
            templateName = htmlName;
          }
          const samplePath = path.join(currentPath, `${htmlName}.html`);
          const hasSample = fs.existsSync(samplePath);
          templates.push({
            name: templateName,
            previewUrl: hasSample
              ? `/email-template/${encodeURIComponent(templateName)}/preview`
              : undefined,
            htmlOnly: true,
          });
        }
      }

      return templates;
    } catch (error) {
      this.logger.error(`Failed to read directory: ${currentPath}`, error);
      return [];
    }
  }

  /**
   * Get individual template details with data - supports subfolder structure
   */
  getTemplateDetails(templateName: string): {
    name: string;
    sampleJson?: Record<string, any>;
    previewUrl?: string;
  } | null {
    try {
      const templatePath = this.getTemplatePath(templateName);

      // For subfolder organization, data files are in the same folder as the template
      const templateDir = path.dirname(templatePath);
      // Get the actual template filename without extension
      const templateFileName = path.basename(
        templatePath,
        this.templateFileNameSuffix,
      );
      const jsonPath = path.join(
        templateDir,
        `${templateFileName}.${SAMPLE_JSON_FILE_EXTENSION}`,
      );
      const previewPath = path.join(
        templateDir,
        `${templateFileName}.${PREVIEW_FILE_EXTENSION}`,
      );

      const exists = fs.existsSync(templatePath);

      if (!exists) {
        return null;
      }

      const hasSampleJson = fs.existsSync(jsonPath);
      const hasPreview = fs.existsSync(previewPath);
      let sampleJson: Record<string, any> | undefined = undefined;

      if (hasSampleJson) {
        sampleJson = this.loadTemplateData(templateName) || undefined;
      }

      return {
        name: templateName,
        sampleJson,
        previewUrl: hasPreview
          ? `/email-template/${encodeURIComponent(templateName)}/preview`
          : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get template details for ${templateName}`,
        error,
      );
      return {
        name: templateName,
      };
    }
  }

  /**
   * Load template data from single JSON file - supports subfolder structure
   */
  loadTemplateData(templateName: string): Record<string, any> | null {
    try {
      // For subfolder organization, data files are in the same folder as the template
      const templatePath = this.getTemplatePath(templateName);
      const templateDir = path.dirname(templatePath);
      // Get the actual template filename without extension
      const templateFileName = path.basename(
        templatePath,
        this.templateFileNameSuffix,
      );
      const dataFileName = `${templateFileName}.json`;
      const dataPath = path.join(templateDir, dataFileName);

      if (!fs.existsSync(dataPath)) {
        return null;
      }

      const dataContent = fs.readFileSync(dataPath, 'utf-8');
      return JSON.parse(dataContent) as Record<string, any>;
    } catch (error) {
      this.logger.error(
        `Failed to load template data: ${templateName}.json`,
        error,
      );
      return null;
    }
  }

  /**
   * Get preview HTML file content - supports subfolder structure
   */
  getSampleHtml(templateName: string): string | null {
    try {
      // Try both flat and subfolder structure for HTML file, mirroring getTemplatePath logic
      const baseName = templateName.endsWith(this.templateFileNameSuffix)
        ? templateName.replace(this.templateFileNameSuffix, '')
        : templateName;

      // 1. Flat path: src/assets/content/email/poc/foo.html
      let samplePath = path.join(this.assetsBasePath, `${baseName}.html`);
      if (fs.existsSync(samplePath)) {
        return fs.readFileSync(samplePath, 'utf-8');
      }

      // 2. Subfolder path: src/assets/content/email/poc/foo/foo.html
      samplePath = path.join(this.assetsBasePath, baseName, `${baseName}.html`);
      if (fs.existsSync(samplePath)) {
        return fs.readFileSync(samplePath, 'utf-8');
      }

      // 3. Fallback to original path (for backward compatibility)
      samplePath = path.join(this.assetsBasePath, `${baseName}.html`);
      if (fs.existsSync(samplePath)) {
        return fs.readFileSync(samplePath, 'utf-8');
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Failed to load sample HTML: ${templateName}.html`,
        error,
      );
      return null;
    }
  }

  /**
   * Generate preview HTML using template and sample data if no preview file exists
   */
  generatePreviewHtml(templateName: string): string | null {
    try {
      const sampleData = this.loadTemplateData(templateName);

      if (!sampleData) {
        this.logger.warn(
          `No sample data available for template: ${templateName}`,
        );
        return null;
      }

      const result = this.renderTemplate({
        templateName,
        baseData: sampleData,
      });

      return result.success ? result.html : null;
    } catch (error) {
      this.logger.error(
        `Failed to generate preview HTML for ${templateName}`,
        error,
      );
      return null;
    }
  }

  /**
   * Get preview HTML (from file or generate if needed)
   */
  getPreviewHtmlOrGenerate(templateName: string): string | null {
    // First try to get existing sample file
    const existingSample = this.getSampleHtml(templateName);
    if (existingSample) {
      return existingSample;
    }

    // If no sample file, try to generate one
    return this.generatePreviewHtml(templateName);
  }
}
