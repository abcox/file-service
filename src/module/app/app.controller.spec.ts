import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { LoggerService } from '../logger/logger.service';

// Mock the JWT guard
const mockJwtGuard = {
  canActivate: jest.fn(() => true),
};

// Mock Express Request/Response
const mockRequest = (acceptsHtml: boolean) => ({
  accepts: jest.fn(() => (acceptsHtml ? 'html' : false)),
  get: jest.fn(() => 'Mozilla/5.0 Test Browser'),
});

const mockResponse = () => {
  return {
    type: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
};

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;
  const mockAppInfo = {
    name: 'Test App Info',
    description: 'Test service description',
    version: '1.0.0-test',
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getAppInfo: jest.fn(() => mockAppInfo),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('root', () => {
    it('should return JSON when client requests application/json', () => {
      const req = mockRequest(false);
      const res = mockResponse();
      const getAppInfoSpy = jest.spyOn(appService, 'getAppInfo');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      appController.getAppInfo(req as any, res as any);

      expect(getAppInfoSpy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockAppInfo);
      expect(res.type).not.toHaveBeenCalled();
    });

    it('should return HTML when browser requests html', () => {
      const req = mockRequest(true);
      const res = mockResponse();
      const getAppInfoSpy = jest.spyOn(appService, 'getAppInfo');
      const generateHtmlSpy = jest
        .spyOn(appService, 'generateAppInfoHtml')
        .mockReturnValue('<html>test</html>');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      appController.getAppInfo(req as any, res as any);

      expect(getAppInfoSpy).toHaveBeenCalled();
      expect(generateHtmlSpy).toHaveBeenCalledWith(mockAppInfo);
      expect(res.type).toHaveBeenCalledWith('text/html');
      expect(res.send).toHaveBeenCalledWith('<html>test</html>');
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('health', () => {
    it('should return health status', () => {
      const result = appController.health();
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('service', 'vorba-file-service');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('version');
    });
  });
});
