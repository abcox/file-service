import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from '../../service/app/app.service';
import { JwtAuthGuard } from '../../auth/auth.guard';
import { LoggerService } from '../../service/logger/logger.service';

// Mock the JWT guard
const mockJwtGuard = {
  canActivate: jest.fn(() => true),
};

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getAppInfo: jest.fn(() => 'Test App Info'),
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
    it('should return App info', () => {
      const getHelloSpy = jest.spyOn(appService, 'getAppInfo');
      expect(appController.getAppInfo()?.length).toBeGreaterThan(0);
      expect(getHelloSpy).toHaveBeenCalled();
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
