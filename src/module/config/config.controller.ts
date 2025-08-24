import {
  Controller,
  Get,
  //LoggerService,
  //Post,
  //UploadedFile,
  //UseInterceptors,
  //Param,
  //Delete,
  //Res,
  //Query,
} from '@nestjs/common';
import {
  //ApiTags,
  ApiOperation,
  //ApiConsumes,
  //ApiBody,
  //ApiParam,
  ApiResponse,
  //ApiQuery,
  //ApiBearerAuth, // use Auth decorator
  //ApiExcludeEndpoint,
} from '@nestjs/swagger';
//import { Response } from 'express';
import { Auth } from '../auth/auth.guard';
import { LoggerService } from '../../service/logger/logger.service';
import { KeyVaultService } from '../../service/keyvault/keyvault.service';
import { AppConfigService } from './config.service';

@Controller()
export class ConfigController {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly keyvaultService: KeyVaultService,
    private readonly configService: AppConfigService,
  ) {
    this.loggerService.debug('AppController constructor called');
  }

  @Get('config/vault/client/url')
  @Auth({ public: true })
  @ApiOperation({ summary: 'Get vault client URL' })
  @ApiResponse({
    status: 200,
    description: 'Returns the URL configured to the KeyVault SecretClient',
  })
  getVaultUrl() {
    const url = this.keyvaultService.getVaultClientUrl();
    return {
      vaultClientUrl: url,
    };
  }

  @Get('config')
  @Auth({ roles: ['admin'] })
  @ApiOperation({ summary: 'Get config' })
  @ApiResponse({
    status: 200,
    description: 'Get the application config file json',
  })
  getConfig() {
    const config = this.configService.getConfig();
    return {
      config,
    };
  }
}
