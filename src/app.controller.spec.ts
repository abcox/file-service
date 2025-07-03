import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/api-key.guard';

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
            getHello: jest.fn(() => 'Hello World!'),
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
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
      expect(appService.getHello).toHaveBeenCalled();
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
