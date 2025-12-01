import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Error as MongooseError } from 'mongoose';
import { IContact } from '../db/doc/entity/contact/contact.entity';
import { CONTACT_MODEL } from '../db/doc/doc-db.constants';

export interface GetContactListRequest {
  page?: number;
  limit?: number;
  status?: string;
  isActive?: boolean;
}

export interface IListResponse<T> {
  data: Array<T>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ContactListItem {
  _id: string;
  name: string;
  emails: Array<{ address: string; type: string; isPrimary?: boolean }>;
  company?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetContactListResponse extends IListResponse<ContactListItem> {
  contacts: ContactListItem[];
}

export interface SearchContactsRequest {
  searchTerm: string;
  page?: number;
  limit?: number;
}

export interface SearchContactsResponse extends IListResponse<IContact> {
  contacts: IContact[];
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    @InjectModel(CONTACT_MODEL)
    private readonly contactModel: Model<IContact>,
  ) {}

  async createContact(
    contactData: Omit<IContact, '_id' | 'createdAt' | 'updatedAt'>,
  ): Promise<IContact> {
    try {
      this.logger.log(`Creating new contact with name: ${contactData.name}`);

      // Check if contact with same email already exists (primary email check)
      const primaryEmail = contactData.emails.find((email) => email.isPrimary);
      if (primaryEmail) {
        const existingContact = await this.contactModel
          .findOne({ 'emails.address': primaryEmail.address })
          .exec();
        if (existingContact) {
          this.logger.warn(
            `Contact with email '${primaryEmail.address}' already exists`,
          );
          throw new Error(
            `Contact with email '${primaryEmail.address}' already exists`,
          );
        }
      }

      // Create the new contact
      const newContact = await this.contactModel.create(contactData);
      this.logger.log(
        `Contact created successfully with ID: ${newContact._id}`,
      );

      return newContact;
    } catch (error) {
      // Handle Mongoose validation errors specifically
      if (error instanceof MongooseError.ValidationError) {
        const validationErrors = Object.values(error.errors).map(
          (err) => err.message,
        );
        const errorMessage = `Validation failed: ${validationErrors.join(', ')}`;
        this.logger.warn(`Contact validation failed: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      // Handle other errors
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to create contact with name '${contactData.name}'`,
        errorMessage,
      );
      throw new Error(`Failed to create contact: ${errorMessage}`);
    }
  }

  async getContactById(id: string): Promise<IContact | null> {
    try {
      this.logger.log(`Fetching contact with ID: ${id}`);
      const contact = await this.contactModel.findById(id).exec();

      if (!contact) {
        this.logger.warn(`Contact with ID '${id}' not found`);
        return null;
      }

      this.logger.log(`Contact found: ${contact.name}`);
      return contact;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch contact by ID '${id}'`, errorMessage);
      throw new Error(`Failed to fetch contact: ${errorMessage}`);
    }
  }

  async getContactByEmail(email: string): Promise<IContact | null> {
    try {
      this.logger.log(`Fetching contact with email: ${email}`);
      const contact = await this.contactModel
        .findOne({ 'emails.address': email })
        .exec();

      if (!contact) {
        this.logger.warn(`Contact with email '${email}' not found`);
        return null;
      }

      this.logger.log(`Contact found: ${contact.name}`);
      return contact;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to fetch contact by email '${email}'`,
        errorMessage,
      );
      throw new Error(`Failed to fetch contact: ${errorMessage}`);
    }
  }

  async updateContact(
    id: string,
    updateData: Partial<Omit<IContact, '_id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<IContact | null> {
    try {
      this.logger.log(`Updating contact with ID: ${id}`);

      // Check if contact exists
      const existingContact = await this.contactModel.findById(id).exec();
      if (!existingContact) {
        this.logger.warn(`Contact with ID '${id}' not found`);
        throw new Error(`Contact with ID '${id}' not found`);
      }

      // Update the contact
      const updatedContact = await this.contactModel
        .findByIdAndUpdate(
          id,
          { ...updateData, updatedAt: new Date() },
          { new: true },
        )
        .exec();

      this.logger.log(`Contact with ID '${id}' updated successfully`);
      return updatedContact;
    } catch (error) {
      // Handle Mongoose validation errors specifically
      if (error instanceof MongooseError.ValidationError) {
        const validationErrors = Object.values(error.errors).map(
          (err) => err.message,
        );
        const errorMessage = `Validation failed: ${validationErrors.join(', ')}`;
        this.logger.warn(`Contact validation failed: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to update contact with ID '${id}'`,
        errorMessage,
      );
      throw new Error(`Failed to update contact: ${errorMessage}`);
    }
  }

  async deleteContact(id: string): Promise<{ message: string }> {
    try {
      this.logger.log(`Attempting to delete contact with ID: ${id}`);

      // Check if contact exists
      const existingContact = await this.contactModel.findById(id).exec();
      if (!existingContact) {
        this.logger.warn(`Contact with ID '${id}' not found`);
        throw new Error(`Contact with ID '${id}' not found`);
      }

      // Delete the contact
      await this.contactModel.findByIdAndDelete(id).exec();
      this.logger.log(`Contact with ID '${id}' deleted successfully`);

      return { message: 'Contact deleted successfully' };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to delete contact with ID '${id}'`,
        errorMessage,
      );
      throw new Error(`Failed to delete contact: ${errorMessage}`);
    }
  }

  async softDeleteContact(id: string): Promise<IContact | null> {
    try {
      this.logger.log(`Soft deleting contact with ID: ${id}`);
      return await this.updateContact(id, { isActive: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to soft delete contact with ID '${id}'`,
        errorMessage,
      );
      throw new Error(`Failed to soft delete contact: ${errorMessage}`);
    }
  }

  async getContactList(
    request: GetContactListRequest,
  ): Promise<GetContactListResponse> {
    const { page = 1, limit = 10, status, isActive = true } = request;
    try {
      this.logger.log(`Fetching contact list - page: ${page}, limit: ${limit}`);

      const query: Partial<IContact> = { isActive };
      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;
      const total = await this.contactModel.countDocuments(query).exec();

      const contacts = await this.contactModel
        .find(query, {
          name: 1,
          emails: 1,
          company: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ updatedAt: -1 }) // Most recent first
        .skip(skip)
        .limit(limit)
        .exec();

      const contactList: ContactListItem[] = contacts.map((contact) => ({
        _id: contact._id.toString(),
        name: contact.name,
        emails: contact.emails,
        company: contact.company,
        status: contact.status,
        createdAt: contact.createdAt || new Date(),
        updatedAt: contact.updatedAt || new Date(),
      }));

      const totalPages = Math.ceil(total / limit);

      this.logger.log(`Found ${contactList.length} contacts (${total} total)`);
      return {
        contacts: contactList,
        data: contactList,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to fetch contact list', errorMessage);
      throw new Error(`Failed to fetch contact list: ${errorMessage}`);
    }
  }

  async searchContacts(
    request: SearchContactsRequest,
  ): Promise<SearchContactsResponse> {
    const { searchTerm, page = 1, limit = 10 } = request;
    try {
      this.logger.log(`Searching contacts with term: ${searchTerm}`);

      const searchRegex = new RegExp(searchTerm, 'i'); // Case-insensitive search
      const query = {
        isActive: true,
        $or: [
          { name: searchRegex },
          { firstName: searchRegex },
          { lastName: searchRegex },
          { company: searchRegex },
          { 'emails.address': searchRegex },
        ],
      };

      const skip = (page - 1) * limit;
      const total = await this.contactModel.countDocuments(query).exec();

      const contacts = await this.contactModel
        .find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();

      const totalPages = Math.ceil(total / limit);

      this.logger.log(
        `Found ${contacts.length} contacts matching search (${total} total)`,
      );
      return {
        contacts,
        data: contacts,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to search contacts with term '${searchTerm}'`,
        errorMessage,
      );
      throw new Error(`Failed to search contacts: ${errorMessage}`);
    }
  }
}
