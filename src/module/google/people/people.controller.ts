import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { defaultPersonFields, PeopleService } from './people.service';
import { ContactGroupsListDto } from './dto/contact-groups-list.dto';
import { Auth } from '../../auth';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiQuery,
} from '@nestjs/swagger';

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
  @Get('contact/group/:resourceNameId/member/list')
  @Auth({ roles: ['admin'] })
  async getContactGroupMembers(
    @Param('resourceNameId') resourceNameId: string,
  ): Promise<any[]> {
    return await this.peopleService.getContactGroupMemberList(resourceNameId);
  }

  /**
   * GET /google/people/person/:resourceName
   * Returns a person's details from the People API.
   */
  @Get('person/:resourceNameId/detail')
  @Auth({ roles: ['admin'] })
  @ApiOperation({
    summary: 'Get person details by resource name ID (admin only)',
  })
  @ApiParam({
    name: 'resourceNameId',
    description:
      'The resource name ID of the person (e.g., c8354119414991994057)',
    example: 'c8354119414991994057',
  })
  @ApiQuery({
    name: 'fieldNameList',
    required: false,
    example:
      'names,emailAddresses,phoneNumbers (default: names,emailAddresses)',
    description:
      'Comma-separated list of fields to include in the response (default: names,emailAddresses)',
  })
  async getPersonDetail(
    @Param('resourceNameId') resourceNameId: string,
    @Query('fieldNameList') fieldNameList: string = defaultPersonFields,
  ) {
    return await this.peopleService.getPersonDetail(
      resourceNameId,
      fieldNameList,
    );
  }

  /* POST /google/people/user-defined-field */
  @Post('person/:resourceNameId/user-defined-field')
  @Auth({ roles: ['admin'] })
  @ApiBody({
    description: 'User defined field data to upsert',
    type: UpsertUserDefinedFieldRequest,
  })
  async upsertUserDefinedField(
    @Param('resourceNameId') resourceNameId: string,
    @Body() request: UpsertUserDefinedFieldRequest,
  ): Promise<any> {
    /* 
    console.log(
      `PeopleController.upsertUserDefinedField called for resourceNameId=${resourceNameId}; userDefinedField=${JSON.stringify(request.userDefinedField)}`,
    ); */
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
      resourceNameId,
      userDefinedField,
      request.timeZone,
    );
  }

  // GET /google/people/:resourceName/user-defined-field
  @Get('person/:resourceNameId/user-defined-field')
  @Auth({ roles: ['admin'] })
  @ApiQuery({ name: 'timeZone', required: false, type: String })
  async getUserDefinedField(
    @Param('resourceNameId') resourceNameId: string,
    @Query('key') key: string,
    @Query('timeZone') timeZone?: string,
  ): Promise<any> {
    const result = await this.peopleService.getContactDefinedField(
      resourceNameId,
      key,
      timeZone,
    );
    return result;
  }
}
