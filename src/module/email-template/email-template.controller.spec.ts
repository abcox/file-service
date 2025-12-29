import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EmailTemplateController } from './email-template.controller';
import { EmailTemplateService } from './email-template.service';

describe('EmailTemplateController', () => {
  let controller: EmailTemplateController;
  //let service: EmailTemplateService;

  const mockEmailTemplateService = {
    getAvailableTemplates: jest.fn(),
    getTemplateDetails: jest.fn(),
    renderTemplate: jest.fn(), // Still used internally by renderTemplateHtml
    loadTemplateData: jest.fn(),
    clearCache: jest.fn(),
    getPreviewHtmlOrGenerate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailTemplateController],
      providers: [
        {
          provide: EmailTemplateService,
          useValue: mockEmailTemplateService,
        },
      ],
    }).compile();

    controller = module.get<EmailTemplateController>(EmailTemplateController);
    //service = module.get<EmailTemplateService>(EmailTemplateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAvailableTemplates', () => {
    it('should return simplified template list', () => {
      const mockTemplates = [
        {
          name: 'template1',
          previewUrl: '/email-template/template1/preview',
        },
        {
          name: 'template2',
        },
      ];
      mockEmailTemplateService.getAvailableTemplates.mockReturnValue(
        mockTemplates,
      );

      const result = controller.getEmailTemplateList();

      expect(result).toEqual({
        templates: mockTemplates,
        success: true,
      });
      expect(mockEmailTemplateService.getAvailableTemplates).toHaveBeenCalled();
    });
  });

  describe('getTemplate', () => {
    it('should return template details with data', () => {
      const mockDetails = {
        name: 'test-template',
        exists: true,
        hasData: true,
        data: { recipientName: 'John', companyName: 'Vorba' },
        hasSample: true,
        previewUrl: '/email-template/test-template/preview',
      };
      mockEmailTemplateService.getTemplateDetails.mockReturnValue(mockDetails);

      const result = controller.getTemplate('test-template');

      expect(result).toEqual({
        ...mockDetails,
        success: true,
      });
      expect(mockEmailTemplateService.getTemplateDetails).toHaveBeenCalledWith(
        'test-template',
      );
    });

    it('should throw NotFoundException for non-existent template', () => {
      const mockDetails = {
        name: 'missing-template',
        exists: false,
        hasData: false,
        hasSample: false,
      };
      mockEmailTemplateService.getTemplateDetails.mockReturnValue(mockDetails);

      expect(() => controller.getTemplate('missing-template')).toThrow(
        NotFoundException,
      );
    });
  });

  describe('renderTemplateHtml', () => {
    it('should render template as HTML with template data and custom overrides', () => {
      const mockTemplateData = {
        recipientName: 'Default',
        companyName: 'Vorba',
      };
      const mockResult = {
        html: '<h1>Hello Jane!</h1>',
        success: true,
        templateUsed: 'test-template',
        dataLayers: ['base'],
      };
      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      mockEmailTemplateService.loadTemplateData.mockReturnValue(
        mockTemplateData,
      );
      mockEmailTemplateService.renderTemplate.mockReturnValue(mockResult);

      const dto = {
        templateName: 'test-template',
        customData: { recipientName: 'Jane' },
      };

      controller.renderTemplateHtml(dto, mockResponse as any);

      expect(mockEmailTemplateService.loadTemplateData).toHaveBeenCalledWith(
        'test-template',
      );
      expect(mockEmailTemplateService.renderTemplate).toHaveBeenCalledWith({
        templateName: 'test-template',
        baseData: { recipientName: 'Jane', companyName: 'Vorba' },
      });
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/html',
      );
      expect(mockResponse.send).toHaveBeenCalledWith('<h1>Hello Jane!</h1>');
    });

    it('should render template as HTML with only template data when no custom data provided', () => {
      const mockTemplateData = {
        recipientName: 'Default',
        companyName: 'Vorba',
      };
      const mockResult = {
        html: '<h1>Hello Default!</h1>',
        success: true,
        templateUsed: 'test-template',
        dataLayers: ['base'],
      };
      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      mockEmailTemplateService.loadTemplateData.mockReturnValue(
        mockTemplateData,
      );
      mockEmailTemplateService.renderTemplate.mockReturnValue(mockResult);

      const dto = {
        templateName: 'test-template',
      };

      controller.renderTemplateHtml(dto, mockResponse as any);

      expect(mockResponse.send).toHaveBeenCalledWith('<h1>Hello Default!</h1>');
    });

    it('should handle rendering errors and return 500 status', () => {
      const mockTemplateData = {};
      const mockResult = {
        html: '',
        success: false,
        error: 'Template not found',
        templateUsed: 'missing-template',
        dataLayers: [],
      };
      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      mockEmailTemplateService.loadTemplateData.mockReturnValue(
        mockTemplateData,
      );
      mockEmailTemplateService.renderTemplate.mockReturnValue(mockResult);

      const dto = {
        templateName: 'missing-template',
      };

      controller.renderTemplateHtml(dto, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).toHaveBeenCalledWith(
        'Error rendering template: Template not found',
      );
    });
  });

  describe('getPreview', () => {
    it('should return preview HTML', () => {
      const mockHtml = '<h1>Preview HTML</h1>';
      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      mockEmailTemplateService.getPreviewHtmlOrGenerate.mockReturnValue(
        mockHtml,
      );

      controller.getPreview('test-template', mockResponse as any);

      expect(
        mockEmailTemplateService.getPreviewHtmlOrGenerate,
      ).toHaveBeenCalledWith('test-template');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/html; charset=utf-8',
      );
      expect(mockResponse.send).toHaveBeenCalledWith(mockHtml);
    });

    it('should throw NotFoundException when no preview available', () => {
      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      mockEmailTemplateService.getPreviewHtmlOrGenerate.mockReturnValue(null);

      expect(() =>
        controller.getPreview('missing-template', mockResponse as any),
      ).toThrow(NotFoundException);
    });
  });

  describe('downloadPreview', () => {
    it('should download preview HTML file', () => {
      const mockHtml = '<h1>Preview HTML</h1>';
      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      mockEmailTemplateService.getPreviewHtmlOrGenerate.mockReturnValue(
        mockHtml,
      );

      controller.downloadPreview('test-template', mockResponse as any);

      expect(
        mockEmailTemplateService.getPreviewHtmlOrGenerate,
      ).toHaveBeenCalledWith('test-template');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/octet-stream',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="test-template-preview.html"',
      );
      expect(mockResponse.send).toHaveBeenCalledWith(mockHtml);
    });

    it('should throw NotFoundException when no preview available for download', () => {
      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      mockEmailTemplateService.getPreviewHtmlOrGenerate.mockReturnValue(null);

      expect(() =>
        controller.downloadPreview('missing-template', mockResponse as any),
      ).toThrow(NotFoundException);
    });
  });

  describe('clearCache', () => {
    it('should clear template cache', () => {
      const result = controller.clearCache();

      expect(result).toEqual({
        success: true,
        message: 'Template cache cleared',
      });
      expect(mockEmailTemplateService.clearCache).toHaveBeenCalled();
    });
  });
});
