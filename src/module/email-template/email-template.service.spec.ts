import { Test, TestingModule } from '@nestjs/testing';
import { EmailTemplateService } from './email-template.service';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('EmailTemplateService', () => {
  let service: EmailTemplateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailTemplateService],
    }).compile();

    service = module.get<EmailTemplateService>(EmailTemplateService);

    // Clear mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('renderSimpleTemplate', () => {
    it('should render template with basic data', () => {
      // Mock template file
      const templateContent = '<h1>Hello {{name}}!</h1>';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(templateContent);

      const result = service.renderSimpleTemplate('test-template', {
        name: 'John',
      });

      expect(result).toBe('<h1>Hello John!</h1>');
      expect(mockFs.readFileSync).toHaveBeenCalled();
    });

    it('should throw error when template not found', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await expect(
        service.renderSimpleTemplate('missing-template'),
      ).rejects.toThrow('Template file not found');
    });
  });

  describe('renderTemplate', () => {
    it('should render template with multi-layer data', () => {
      const templateContent =
        '<h1>{{greeting}} {{name}}!</h1><p>{{message}}</p>';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(templateContent);

      const result = service.renderTemplate({
        templateName: 'test-template',
        baseData: { greeting: 'Hello', name: 'World' },
        personalizationData: { name: 'John' }, // Override name
        contextData: { message: 'Welcome back!' },
      });

      expect(result.success).toBe(true);
      expect(result.html).toBe('<h1>Hello John!</h1><p>Welcome back!</p>');
      expect(result.dataLayers).toEqual(['base', 'personalization', 'context']);
    });

    it('should handle template errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = service.renderTemplate({
        templateName: 'missing-template',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.html).toBe('');
    });
  });

  describe('getAvailableTemplates', () => {
    it('should return list of available templates', () => {
      mockFs.readdirSync.mockReturnValue([
        'template1.hbs',
        'template2.hbs',
        'not-template.txt',
      ] as any);

      const templates = service.getAvailableTemplates();

      expect(templates).toEqual(['template1', 'template2']);
    });

    it('should handle directory read errors', () => {
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const templates = service.getAvailableTemplates();

      expect(templates).toEqual([]);
    });
  });

  describe('loadTemplateData', () => {
    it('should load JSON data file', () => {
      const testData = { name: 'John', age: 30 };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(testData));

      const data = service.loadTemplateData('test-template');

      expect(data).toEqual(testData);
    });

    it('should return null when data file not found', () => {
      mockFs.existsSync.mockReturnValue(false);

      const data = service.loadTemplateData('test-template');

      expect(data).toBeNull();
    });

    it('should handle JSON parse errors', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');

      const data = service.loadTemplateData('test-template');

      expect(data).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should clear template cache', () => {
      // This test just ensures the method runs without error
      expect(() => service.clearCache()).not.toThrow();
    });
  });
});
