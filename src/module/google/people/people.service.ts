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
import { DiagnosticProvider } from '../../diagnostic/diagnostic-provider.interface';
import { DiagnosticService } from '../../diagnostic/diagnostic.service';
import { ServiceStatusDto } from '../../diagnostic/dto/service-status.dto';

export interface GoogleApisPeopleServiceOptions {
  scopes?: string[];
}

export const defaultPersonFields =
  'names,emailAddresses,memberships,userDefined';

@Injectable()
export class PeopleService implements DiagnosticProvider {
  private readonly logger = new Logger(PeopleService.name);
  private readonly _service: people_v1.People;
  private readonly timeZone: string;
  private readonly diagnosticMessage: string;

  // initialize default config status as degraded until we verify the configuration and initialization in the constructor
  private configStatus: {
    hasConfig: boolean;
    hasScopes: boolean;
    isInitialized: boolean;
  } = {
    hasConfig: false,
    hasScopes: false,
    isInitialized: false,
  };

  constructor(
    private appConfigService: AppConfigService,
    private diagnosticService: DiagnosticService,
  ) {
    // Register with diagnostic service
    this.diagnosticService.registerProvider('google-people', this);
    const {
      peopleServiceOptions: config,
      serviceAccountJsonContent: keyFileJsonContent,
      serviceAccountJsonKeyFilePathname: keyFilePath,
      userEmail,
    } = this.appConfigService.getConfig().googleApis || {};
    if (!config) {
      //throw new Error('Google API people options are not configured');
      this.logger.warn(
        'Google API people options are not configured, using defaults with calendar scope',
      );
      return;
    }
    this.configStatus.hasConfig = true;
    if (!config.scopes || config.scopes.length === 0) {
      //throw new Error('Google API people scopes are not configured');
      this.diagnosticMessage =
        'Google API people scopes are not configured, using default scope for people';
      this.logger.warn(this.diagnosticMessage);
      return;
    }
    this.configStatus.hasScopes = true;
    this._service = this.createPeopleServiceFromKeyFilePathOrContent(
      keyFilePath,
      keyFileJsonContent,
      userEmail,
      config.scopes,
    );
    this.configStatus.isInitialized = true;
    this.timeZone = this.appConfigService.getTimeZoneConfig().effective;
  }

  /**
   * DiagnosticProvider implementation
   */
  getDiagnosticStatus(): ServiceStatusDto {
    const { hasConfig, hasScopes, isInitialized } = this.configStatus;

    if (!hasConfig) {
      return {
        name: 'google-people',
        status: 'unavailable',
        reason: 'Missing googleApis.peopleServiceOptions config',
        details: { hasConfig, hasScopes, isInitialized },
        timestamp: new Date().toISOString(),
      };
    }

    if (!hasScopes) {
      return {
        name: 'google-people',
        status: 'degraded',
        reason: 'No scopes configured for People API',
        details: { hasConfig, hasScopes, isInitialized },
        timestamp: new Date().toISOString(),
      };
    }

    if (!isInitialized) {
      return {
        name: 'google-people',
        status: 'degraded',
        reason: 'Service not fully initialized',
        details: { hasConfig, hasScopes, isInitialized },
        timestamp: new Date().toISOString(),
      };
    }

    return {
      name: 'google-people',
      status: 'ready',
      details: { hasConfig, hasScopes, isInitialized },
      timestamp: new Date().toISOString(),
    };
  }

  private get service(): people_v1.People {
    if (!this._service) {
      throw new Error('Google People API service is not initialized');
    }
    return this._service;
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
  async getContactGroupList(): Promise<ContactGroupsListDto> {
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
  async getContactGroupMemberList(
    groupResourceNameId: string,
    maxMembers: number = 100,
    includeDetails: boolean = true,
  ): Promise<people_v1.Schema$Person[]> {
    try {
      const groupResourceName = `contactGroups/${groupResourceNameId}`;
      this.logger.log(`Fetching members for group: ${groupResourceName}`);
      const params: people_v1.Params$Resource$Contactgroups$Get = {
        resourceName: groupResourceName,
        maxMembers,
        groupFields: 'name',
      };
      const response = await this.service.contactGroups.get(params);
      this.logger.log(`Fetched response`, response);

      const memberResourceNames = response.data.memberResourceNames || [];

      if (!includeDetails || memberResourceNames.length === 0) {
        // Return just the resource names as minimal person objects
        return memberResourceNames.map((rn) => ({ resourceName: rn }));
      }

      // Fetch full person details using getBatchGet (max 50 per request)
      const persons: people_v1.Schema$Person[] = [];
      const batchSize = 50;

      for (let i = 0; i < memberResourceNames.length; i += batchSize) {
        const batch = memberResourceNames.slice(i, i + batchSize);
        const batchResponse = await this.service.people.getBatchGet({
          resourceNames: batch,
          personFields: 'names,emailAddresses',
        });
        if (batchResponse.data.responses) {
          for (const personResponse of batchResponse.data.responses) {
            if (personResponse.person) {
              persons.push(personResponse.person);
            }
          }
        }
      }
      this.logger.log(
        `Fetched ${persons.length} members for group: ${groupResourceName}`,
        persons,
      );
      return persons;
    } catch (error) {
      this.logger.error('Failed to fetch contact group members', error);
      throw error;
    }
  }

  /**
   * Fetches a person's details using the Google People API.
   * @param resourceNameId The resource name of the person (e.g., if resourceName = 'people/c8354119414991994057', then resourceNameId = 'c8354119414991994057')
   * @param fieldNameList Optional: comma-separated fields to include (default: 'names,emailAddresses')
   */
  async getPersonDetail(
    resourceNameId: string,
    fieldNameList: string = 'names,emailAddresses',
  ): Promise<people_v1.Schema$Person | null> {
    try {
      const resourceName = `people/${resourceNameId}`;
      this.logger.log(`Fetching person: ${resourceNameId}`);
      const response = await this.service.people.get({
        resourceName: resourceName,
        personFields: fieldNameList,
      });
      return response.data || null;
    } catch (error) {
      this.logger.error('Failed to fetch person', error);
      throw error;
    }
  }

  /* Upsert user defined field key-value pair */
  async upsertUserDefinedField(
    personResourceNameId: string,
    userDefinedField: Record<string, string>,
    timeZone?: string,
  ): Promise<people_v1.Schema$Person | null> {
    try {
      const resourceName = `people/${personResourceNameId}`;
      console.log(
        `PeopleService.upsertUserDefinedField called for resourceName=${resourceName}; userDefinedField=${JSON.stringify(userDefinedField)}; timeZone=${timeZone}`,
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
      const person = await this.getPersonDetail(resourceName, 'userDefined');
      if (!person) {
        throw new Error(`Person not found: ${personResourceNameId}`);
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
        resourceName: resourceName,
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
    resourceNameId: string,
    fieldKey: string,
    timeZone?: string,
  ): Promise<GetContactDefinedFieldResponse> {
    try {
      const resourceName = `people/${resourceNameId}`;
      this.logger.log(
        `Fetching user defined field '${fieldKey}' for person: ${resourceName}`,
      );

      const tz = timeZone || this.timeZone || 'UTC';
      const person = await this.getPersonDetail(resourceName, 'userDefined');
      if (!person || !person.userDefined) {
        throw new Error(`Person not found: ${resourceName}`);
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
