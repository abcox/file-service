import { Injectable, Logger } from '@nestjs/common';
import { ContactGroupsListDto } from './dto/contact-groups-list.dto';
import { google, people_v1, Auth } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { AppConfigService } from '../../config/config.service';
import { GetContactDefinedFieldResponse } from './dto/get-contact-defined-field-response.dto';
import { fromZonedTime, toZonedTime, format as formatTz } from 'date-fns-tz';
import { parseISO } from 'date-fns';
import { ServiceAccountCredentials } from '../google.config';

export interface GoogleApisPeopleServiceOptions {
  scopes?: string[];
}

export const defaultPersonFields =
  'names,emailAddresses,memberships,userDefined';

@Injectable()
export class PeopleService {
  private readonly logger = new Logger(PeopleService.name);
  private readonly service: people_v1.People;
  private readonly timeZone: string;

  constructor(private appConfigService: AppConfigService) {
    const {
      peopleServiceOptions: config,
      serviceAccountJsonContent: keyFileJsonContent,
      serviceAccountJsonKeyFilePathname: keyFilePath,
      userEmail,
    } = this.appConfigService.getConfig().googleApis || {};
    if (!config) {
      throw new Error('Google API people options are not configured');
    }
    if (!config.scopes || config.scopes.length === 0) {
      throw new Error('Google API people scopes are not configured');
    }
    const { scopes } = config;
    this.service = this.createPeopleServiceFromKeyFilePathOrContent(
      keyFilePath,
      keyFileJsonContent,
      userEmail,
      scopes,
    );
    this.timeZone = this.appConfigService.getTimeZoneConfig().effective;
  }

  // Placeholder for Google People API integration
  /* async getProfile(userId: string): Promise<any> {
    this.logger.log(`Fetching profile for user: ${userId}`);
    // TODO: Implement Google People API call
    return {};
  } */

  /**
   * Create Google People API service from service account key file
   * Mirrors createGmailServiceFromKeyFile in GmailService
   */
  createPeopleServiceFromKeyFilePathOrContent(
    keyFilePath?: string,
    keyFileJsonContent?: string,
    userEmail?: string,
    scopes?: string[],
  ): people_v1.People {
    try {
      const keyFile = path.resolve(keyFilePath || '');
      /* if (!fs.existsSync(keyFile) && !KeyFileJsonContent) {
        throw new Error(
          `Service account key file not found: ${keyFile}, and no JSON content provided (via keyvault)`,
        );
      } */
      if (!userEmail) {
        throw new Error(
          'User email for domain-wide delegation is not configured',
        );
      }
      let jwtClient: Auth.JWT | undefined = undefined;
      if (fs.existsSync(keyFile)) {
        jwtClient = new google.auth.JWT({
          keyFile: keyFile,
          scopes,
          subject: userEmail, // Domain user to impersonate
        });
      } else if (keyFileJsonContent) {
        // Parse the JSON content to ensure it's valid
        const credentials = JSON.parse(
          keyFileJsonContent,
        ) as ServiceAccountCredentials;
        // Handle escaped newlines in the private key
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
        jwtClient = new google.auth.JWT({
          email: credentials.client_email,
          key: credentials.private_key,
          scopes,
          subject: userEmail, // Domain user to impersonate
        });
      } else {
        throw new Error(
          `Service account key file not found: ${keyFile}, and no JSON content provided (via keyvault)`,
        );
      }
      return google.people({
        version: 'v1',
        auth: jwtClient,
      });
    } catch (error) {
      this.logger.error(
        'Failed to create People API service from key file',
        error,
      );
      throw error;
    }
  }

  /**
   * Fetches the user's contact groups using the Google People API.
   */
  async getContactGroups(): Promise<ContactGroupsListDto> {
    try {
      const response = await this.service.contactGroups.list();
      return new ContactGroupsListDto(response.data);
    } catch (error) {
      this.logger.error('Failed to fetch contact groups', error);
      throw error;
    }
  }

  /**
   * Fetches the members of a contact group using the Google People API.
   * @param peopleService Google People API client
   * @param groupResourceName The resource name of the contact group (e.g., 'contactGroups/family')
   * @param maxMembers Maximum number of members to fetch (optional)
   */
  async getContactGroupMembers(
    groupResourceName: string,
    maxMembers: number = 100,
  ): Promise<people_v1.Schema$Person[]> {
    try {
      this.logger.log(`Fetching members for group: ${groupResourceName}`);
      const response = await this.service.contactGroups.get({
        resourceName: groupResourceName,
        maxMembers,
      });
      return (response.data.memberResourceNames ||
        []) as people_v1.Schema$Person[];
      // To fetch full person details, you would need to call peopleService.people.get for each memberResourceName
    } catch (error) {
      this.logger.error('Failed to fetch contact group members', error);
      throw error;
    }
  }

  /**
   * Fetches a person's details using the Google People API.
   * @param personResourceName The resource name of the person (e.g., 'people/c8354119414991994057')
   * @param personFields Optional: comma-separated fields to include (default: 'names,emailAddresses')
   */
  async getPerson(
    personResourceName: string,
    personFields: string = 'names,emailAddresses',
  ): Promise<people_v1.Schema$Person | null> {
    try {
      this.logger.log(`Fetching person: ${personResourceName}`);
      const response = await this.service.people.get({
        resourceName: personResourceName,
        personFields,
      });
      return response.data || null;
    } catch (error) {
      this.logger.error('Failed to fetch person', error);
      throw error;
    }
  }

  /* Upsert user defined field key-value pair */
  async upsertUserDefinedField(
    personResourceName: string,
    userDefinedField: Record<string, string>,
    timeZone?: string,
  ): Promise<people_v1.Schema$Person | null> {
    try {
      console.log(
        `PeopleService.upsertUserDefinedField called for personResourceName=${personResourceName}; userDefinedField=${JSON.stringify(userDefinedField)}; timeZone=${timeZone}`,
      );
      const tz = timeZone || this.timeZone || 'UTC';
      // validate the userDefinedField has exactly one key-value pair
      if (!userDefinedField || Object.keys(userDefinedField).length !== 1) {
        throw new Error(
          'userDefinedField must have exactly one key-value pair',
        );
      }
      let valueOut = '';

      //const { key, value: valueIn } = userDefinedField;
      const key = Object.keys(userDefinedField)[0];
      const valueIn = userDefinedField[key];

      // in the case of date values (i.e. LastContactDate), ensure the value is in UTC ISO format using the provided time zone
      if (key.toLocaleUpperCase().endsWith('DATE') && valueIn) {
        // If valueIn is just a date (e.g., "2025-12-30"), add time if needed
        try {
          const localDateTime = parseISO(
            valueIn.length <= 10 ? valueIn + 'T00:00:00' : valueIn,
          );
          console.log(`Parsed local date time: ${localDateTime.toISOString()}`);
          const utcDate = fromZonedTime(localDateTime, tz);
          console.log(
            `fromZonedTime: ${utcDate.toISOString()}; timeZone: ${tz}`,
          );
          valueOut = utcDate?.toISOString() || '';
          console.log(
            `Converted date value from ${valueIn} (time zone: ${tz}) to UTC ISO string: ${valueOut}`,
          );
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          throw new Error(`Invalid date or time zone for ${key}: ${errMsg}`);
        }
      }

      // First, fetch the existing person data
      const person = await this.getPerson(personResourceName, 'userDefined');
      if (!person) {
        throw new Error(`Person not found: ${personResourceName}`);
      }
      // Prepare the userDefined fields
      const userDefinedFields = person.userDefined || [];
      const existingFieldIndex = userDefinedFields.findIndex(
        (field) => field.key === key,
      );
      if (existingFieldIndex >= 0) {
        // Update existing field
        userDefinedFields[existingFieldIndex].value = valueOut || valueIn;
      } else {
        // Add new field
        const newFieldKeyValue: people_v1.Schema$UserDefined = {
          key,
          value: valueOut || valueIn,
        };
        userDefinedFields.push(newFieldKeyValue);
      }
      // Update the person with the new userDefined fields
      const response = await this.service.people.updateContact({
        resourceName: personResourceName,
        updatePersonFields: 'userDefined',
        requestBody: {
          etag: person.etag,
          userDefined: userDefinedFields,
        },
      });
      return response.data || null;
    } catch (error) {
      this.logger.error('Failed to upsert user defined field', error);
      throw error;
    }
  }

  // get user defined field
  async getContactDefinedField(
    personResourceName: string,
    fieldKey: string,
    timeZone?: string,
  ): Promise<GetContactDefinedFieldResponse> {
    try {
      this.logger.log(
        `Fetching user defined field '${fieldKey}' for person: ${personResourceName}`,
      );

      const tz = timeZone || this.timeZone || 'UTC';
      const person = await this.getPerson(personResourceName, 'userDefined');
      if (!person || !person.userDefined) {
        throw new Error(`Person not found: ${personResourceName}`);
      }
      const field = person.userDefined.find((f) => f.key === fieldKey);

      // Default response
      const response: GetContactDefinedFieldResponse = {
        field: field ? { [fieldKey]: field.value ?? '' } : null,
        success: !!field,
        utcDate: null,
        localDate: null,
        timeZone: undefined,
      };

      if (
        field &&
        fieldKey.toLocaleUpperCase().endsWith('DATE') &&
        field.value
      ) {
        const date = new Date(field.value); // This is UTC
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid date format for ${fieldKey}`);
        }
        response.utcDate = date.toISOString();
        response.timeZone = tz;
        try {
          const zoned = toZonedTime(date, tz);
          response.localDate = formatTz(zoned, 'yyyy-MM-dd HH:mm:ssXXX', {
            timeZone: tz,
          });
        } catch (err) {
          this.logger.error(
            `Error converting to zoned time for ${fieldKey}`,
            err,
          );
          response.localDate = null;
        }
      }
      return response;
    } catch (error) {
      this.logger.error('Failed to fetch user defined field', error);
      throw error;
    }
  }
}
