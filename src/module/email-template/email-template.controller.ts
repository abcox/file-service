import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  //Query,
  Logger,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiBody,
  //ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import {
  EmailTemplateService,
  TemplateRenderRequest,
} from './email-template.service';
import { Auth } from '../auth/auth.guard';

@Controller('email-template')
export class EmailTemplateController {
  private readonly logger = new Logger(EmailTemplateController.name);

  constructor(private readonly emailTemplateService: EmailTemplateService) {}

  /**
   * GET /email-template/list - List available templates
   */
  @Get('list')
  @Auth({ public: true })
  @ApiOperation({ summary: 'Get a list of templates' })
  getEmailTemplateList() {
    return {
      templates: this.emailTemplateService.getAvailableTemplates(),
      success: true,
    };
  }

  /**
   * GET /email-template/:name - Get individual template details with data
   */
  @Get(':name')
  @Auth({ public: true })
  @ApiOperation({ summary: 'Get template details with data' })
  getTemplate(@Param('name') templateName: string) {
    const details = this.emailTemplateService.getTemplateDetails(templateName);

    if (!details) {
      throw new NotFoundException(`Template not found: ${templateName}`);
    }

    return {
      ...details,
      success: true,
    };
  }

  /**
   * DELETE /email-templates/cache - Clear template cache
   */
  @Post('cache/clear')
  @Auth({ public: true })
  @ApiOperation({ summary: 'Clear template cache' })
  clearCache() {
    this.emailTemplateService.clearCache();
    return {
      success: true,
      message: 'Template cache cleared',
    };
  }

  /**
   * POST /email-template/render-html - Render template and return HTML
   */
  /**
   * POST /email-template/render/json - Render template and return JSON-escaped HTML
   */
  @Post('render/json')
  @Auth({ public: true })
  @ApiOperation({
    summary: 'Render Email Template as JSON-escaped HTML',
    description:
      'Renders a template and returns JSON-escaped HTML suitable for pasting into JSON requests (like the Gmail send/from-template-html endpoint).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        templateName: {
          type: 'string',
          example: 'vorba-intro-3',
          description: 'Name of the template file (without .hbs extension)',
        },
        customData: {
          type: 'object',
          example: {
            recipientName: 'John Doe',
            customQuestion: 'Custom question here',
          },
          description: 'Optional data to override or extend template defaults',
        },
        minify: {
          type: 'boolean',
          example: true,
          description: 'Whether to minify the HTML output (default: true)',
        },
      },
      required: ['templateName'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'JSON-escaped HTML content ready for use in JSON requests',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            html: {
              type: 'string',
              description: 'JSON-escaped HTML content',
            },
            success: {
              type: 'boolean',
            },
            templateName: {
              type: 'string',
            },
          },
        },
      },
    },
  })
  renderTemplateJson(
    @Body()
    dto: {
      templateName: string;
      customData?: Record<string, any>;
      minify?: boolean;
    },
  ) {
    try {
      // Load template's JSON data
      let templateData =
        this.emailTemplateService.loadTemplateData(dto.templateName) || {};

      // Merge with custom data if provided
      if (dto.customData) {
        templateData = { ...templateData, ...dto.customData };
      }

      const request: TemplateRenderRequest = {
        templateName: dto.templateName,
        baseData: templateData,
        minify: dto.minify,
      };

      const result = this.emailTemplateService.renderTemplate(request);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          templateName: dto.templateName,
        };
      }

      // Return the HTML in JSON format - JSON.stringify will properly escape it
      return {
        html: result.html,
        success: true,
        templateName: dto.templateName,
      };
    } catch (error) {
      this.logger.error('Failed to render template as JSON', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        templateName: dto.templateName,
      };
    }
  }

  @Post('render/html')
  @Auth({ public: true })
  @ApiOperation({
    summary: 'Render Email Template as HTML',
    description:
      'Renders a template and returns HTML directly, suitable for direct browser viewing, email sending, or functional testing.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        templateName: {
          type: 'string',
          example: 'vorba-intro-3',
          description: 'Name of the template file (without .hbs extension)',
        },
        customData: {
          type: 'object',
          example: {
            recipientName: 'John Doe',
            customQuestion: 'Custom question here',
          },
          description: 'Optional data to override or extend template defaults',
        },
        minify: {
          type: 'boolean',
          example: true,
          description: 'Whether to minify the HTML output (default: true)',
        },
      },
      required: ['templateName'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Raw HTML content',
    content: {
      'text/html': {
        schema: {
          type: 'string',
          example: '<!doctype html><html>...</html>',
        },
      },
    },
  })
  renderTemplateHtml(
    @Body()
    dto: {
      templateName: string;
      customData?: Record<string, any>;
      minify?: boolean;
    },
    @Res() res: Response,
  ) {
    try {
      // Load template's JSON data
      let templateData =
        this.emailTemplateService.loadTemplateData(dto.templateName) || {};

      // Merge with custom data if provided
      if (dto.customData) {
        templateData = { ...templateData, ...dto.customData };
      }

      const request: TemplateRenderRequest = {
        templateName: dto.templateName,
        baseData: templateData,
        minify: dto.minify,
      };

      const result = this.emailTemplateService.renderTemplate(request);

      if (!result.success) {
        return res
          .status(500)
          .send(`Error rendering template: ${result.error}`);
      }

      res.setHeader('Content-Type', 'text/html');
      res.send(result.html);
    } catch (error) {
      this.logger.error('Failed to render template as HTML', error);
      res
        .status(500)
        .send(
          `Error rendering template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
    }
  }

  /**
   * GET /email-template/:name/preview - View preview HTML
   */
  @Get(':name/preview')
  @Auth({ public: true })
  @ApiOperation({ summary: 'View preview HTML for template' })
  getPreview(@Param('name') templateName: string, @Res() res: Response) {
    const previewHtml =
      this.emailTemplateService.getPreviewHtmlOrGenerate(templateName);

    if (!previewHtml) {
      throw new NotFoundException(
        `No preview available for template: ${templateName}`,
      );
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(previewHtml);
  }

  /**
   * GET /email-template/:name/preview/download - Download preview HTML file
   */
  @Get(':name/preview/download')
  @Auth({ public: true })
  @ApiOperation({ summary: 'Download preview HTML file for template' })
  downloadPreview(@Param('name') templateName: string, @Res() res: Response) {
    const previewHtml =
      this.emailTemplateService.getPreviewHtmlOrGenerate(templateName);

    if (!previewHtml) {
      throw new NotFoundException(
        `No sample available for template: ${templateName}`,
      );
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${templateName}-preview.html"`,
    );
    res.send(previewHtml);
  }
}
