import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Query,
  Body,
  Param,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { Auth } from '../auth/auth.guard';
import { ContactService } from './contact.service';
import {
  CreateContactDto,
  UpdateContactDto,
  ContactResponseDto,
  ContactListResponseDto,
} from './dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  //@Auth({ roles: ['admin', 'user'] })
  @Auth({ public: true })
  @ApiOperation({ summary: 'Create a new contact' })
  @ApiBody({ description: 'Contact data to create', type: CreateContactDto })
  @ApiResponse({
    status: 201,
    description: 'Contact created successfully',
    type: ContactResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed or contact already exists',
  })
  async createContact(
    @Body() contactData: CreateContactDto,
  ): Promise<ContactResponseDto> {
    try {
      const newContact = await this.contactService.createContact(contactData);
      return {
        success: true,
        message: 'Contact created successfully',
        data: newContact,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        {
          success: false,
          message: errorMessage,
          errors: [errorMessage],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id')
  @Auth({ roles: ['admin', 'user', 'guest'] })
  @ApiOperation({ summary: 'Get contact by ID' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiResponse({
    status: 200,
    description: 'Contact found',
    type: ContactResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async getContactById(@Param('id') id: string): Promise<ContactResponseDto> {
    try {
      const contact = await this.contactService.getContactById(id);
      if (!contact) {
        throw new HttpException(
          {
            success: false,
            message: `Contact with ID '${id}' not found`,
            errors: ['Contact not found'],
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        success: true,
        message: 'Contact found',
        data: contact,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        {
          success: false,
          message: errorMessage,
          errors: [errorMessage],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('by-email/:email')
  @Auth({ roles: ['admin', 'user'] })
  @ApiOperation({ summary: 'Get contact by email address' })
  @ApiParam({ name: 'email', description: 'Contact email address' })
  @ApiResponse({
    status: 200,
    description: 'Contact found',
    type: ContactResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async getContactByEmail(
    @Param('email') email: string,
  ): Promise<ContactResponseDto> {
    try {
      const contact = await this.contactService.getContactByEmail(email);
      if (!contact) {
        throw new HttpException(
          {
            success: false,
            message: `Contact with email '${email}' not found`,
            errors: ['Contact not found'],
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        success: true,
        message: 'Contact found',
        data: contact,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        {
          success: false,
          message: errorMessage,
          errors: [errorMessage],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  @Auth({ roles: ['admin', 'user'] })
  @ApiOperation({ summary: 'Update contact by ID' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiBody({ description: 'Contact data to update', type: UpdateContactDto })
  @ApiResponse({
    status: 200,
    description: 'Contact updated successfully',
    type: ContactResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  async updateContact(
    @Param('id') id: string,
    @Body() updateData: UpdateContactDto,
  ): Promise<ContactResponseDto> {
    try {
      const updatedContact = await this.contactService.updateContact(
        id,
        updateData,
      );
      return {
        success: true,
        message: 'Contact updated successfully',
        data: updatedContact!,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const statusCode = errorMessage.includes('not found')
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      throw new HttpException(
        {
          success: false,
          message: errorMessage,
          errors: [errorMessage],
        },
        statusCode,
      );
    }
  }

  @Delete(':id')
  @Auth({ roles: ['admin'] })
  @ApiOperation({ summary: 'Delete contact by ID (hard delete)' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiResponse({ status: 200, description: 'Contact deleted successfully' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async deleteContact(@Param('id') id: string) {
    try {
      return await this.contactService.deleteContact(id);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const statusCode = errorMessage.includes('not found')
        ? HttpStatus.NOT_FOUND
        : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        {
          success: false,
          message: errorMessage,
          errors: [errorMessage],
        },
        statusCode,
      );
    }
  }

  @Put(':id/soft-delete')
  @Auth({ roles: ['admin', 'user'] })
  @ApiOperation({
    summary: 'Soft delete contact by ID (sets isActive to false)',
  })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiResponse({
    status: 200,
    description: 'Contact soft deleted successfully',
    type: ContactResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async softDeleteContact(
    @Param('id') id: string,
  ): Promise<ContactResponseDto> {
    try {
      const updatedContact = await this.contactService.softDeleteContact(id);
      return {
        success: true,
        message: 'Contact soft deleted successfully',
        data: updatedContact!,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const statusCode = errorMessage.includes('not found')
        ? HttpStatus.NOT_FOUND
        : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        {
          success: false,
          message: errorMessage,
          errors: [errorMessage],
        },
        statusCode,
      );
    }
  }

  @Get()
  @Auth({ public: true })
  @ApiOperation({ summary: 'Get list of contacts with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by contact status',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter by active status (default: true)',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact list retrieved successfully',
    type: ContactListResponseDto,
  })
  async getContactList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('isActive') isActive?: string,
  ): Promise<ContactListResponseDto> {
    try {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 10;
      const isActiveFlag = isActive ? isActive.toLowerCase() === 'true' : true;

      const result = await this.contactService.getContactList({
        page: pageNum,
        limit: limitNum,
        status,
        isActive: isActiveFlag,
      });
      return {
        success: true,
        message: `Found ${result.contacts.length} contacts (${result.total} total)`,
        data: result,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        {
          success: false,
          message: errorMessage,
          errors: [errorMessage],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('search/:searchTerm')
  @Auth({ roles: ['admin', 'user', 'guest'] })
  @ApiOperation({ summary: 'Search contacts by name, email, or company' })
  @ApiParam({ name: 'searchTerm', description: 'Search term to find contacts' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  async searchContacts(
    @Param('searchTerm') searchTerm: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 10;

      const result = await this.contactService.searchContacts({
        searchTerm,
        page: pageNum,
        limit: limitNum,
      });
      return {
        success: true,
        message: `Found ${result.contacts.length} contacts matching search (${result.total} total)`,
        data: result,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        {
          success: false,
          message: errorMessage,
          errors: [errorMessage],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
