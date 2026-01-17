import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { defaultPersonFields, PeopleService } from './people.service';
import { ContactGroupsListDto } from './dto/contact-groups-list.dto';
import { Auth } from '../../auth';
import { ApiBody, ApiOperation, ApiProperty, ApiQuery } from '@nestjs/swagger';

export class UpsertUserDefinedFieldRequest {
  @ApiProperty({
    example: { key: 'LastContactDate', value: '2025-12-30T00:00:00Z' },
  })
  userDefinedField: Record<string, string>;

  @ApiProperty({
    example: 'America/Toronto',
    required: false,
  })
  timeZone?: string;
}

@Controller('google/people')
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  /* @Get(':userId')
  async getProfile(@Param('userId') userId: string) {
    return this.peopleService.getProfile(userId);
  } */

  @Get('contact/group/list')
  @Auth({ roles: ['admin', 'user', 'guest'] })
  @ApiOperation({ summary: 'Get list of contact groups' })
  async getContactGroups(): Promise<ContactGroupsListDto> {
    return await this.peopleService.getContactGroupList();
  }

  /**
   * GET /google/people/contact-groups/:resourceName/members
   * Returns the member resource names for a contact group.
   */
  @Get('contact/group/:resourceId/member/list')
  @Auth({ public: true })
  async getContactGroupMembers(
    @Param('resourceId') resourceId: string,
  ): Promise<any[]> {
    return await this.peopleService.getContactGroupMemberList(resourceId);
  }

  /**
   * GET /google/people/person/:resourceName
   * Returns a person's details from the People API.
   */
  @Get('person/:resourceName')
  @Auth({ public: true })
  async getPerson(
    @Param('resourceName') resourceName: string,
    @Query('fields') fields: string = defaultPersonFields,
  ) {
    return await this.peopleService.getPerson(resourceName, fields);
  }

  /* POST /google/people/user-defined-field */
  @Post('person/:resourceName/user-defined-field')
  @Auth({ public: true })
  @ApiBody({
    description: 'User defined field data to upsert',
    type: UpsertUserDefinedFieldRequest,
  })
  async upsertUserDefinedField(
    @Param('resourceName') resourceName: string,
    @Body() request: UpsertUserDefinedFieldRequest,
  ): Promise<any> {
    console.log(
      `PeopleController.upsertUserDefinedField called for resourceName=${resourceName}; userDefinedField=${JSON.stringify(request.userDefinedField)}`,
    );
    const { key, value } = request.userDefinedField;
    console.log(`key=${key}, value=${value}`);
    const userDefinedField: Record<string, string> = { [key]: value };
    /* return await this.peopleService.upsertUserDefinedField(resourceName, {
      [key]: value,
    }); */
    console.log(
      `User defined field to upsert: ${JSON.stringify(userDefinedField)}`,
    );
    return await this.peopleService.upsertUserDefinedField(
      resourceName,
      userDefinedField,
      request.timeZone,
    );
  }

  // GET /google/people/:resourceName/user-defined-field
  @Get('person/:resourceName/user-defined-field')
  @Auth({ public: true })
  @ApiQuery({ name: 'timeZone', required: false, type: String })
  async getUserDefinedField(
    @Param('resourceName') resourceName: string,
    @Query('key') key: string,
    @Query('timeZone') timeZone?: string,
  ): Promise<any> {
    const result = await this.peopleService.getContactDefinedField(
      resourceName,
      key,
      timeZone,
    );
    return result;
  }
}
