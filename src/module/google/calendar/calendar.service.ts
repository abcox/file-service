import { Injectable, Logger } from '@nestjs/common';
import { google, calendar_v3, Auth } from 'googleapis';
//import { GaxiosResponseWithHTTP2 } from 'googleapis-common';
import * as fs from 'fs';
import * as path from 'path';
import { AppConfigService } from '../../config/config.service';
import { GetGoogleCalendarListDto } from './dto/get-calendar-event-list.dto';
import { CalendarEventDeleteBatchPostResponseDto } from './dto/calendar-event-delete-batch-post-response.dto';
import { CalendarEventCreatePostResponseDto } from './dto/calendar-event-create-post-response.dto';
import { GoogleCalendarEventDto } from './dto/google-calendar-event.dto';
import { ServiceAccountCredentials } from '../google.config';

export interface GoogleApisCalendarServiceOptions {
  scopes?: string[];
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);
  private readonly service: calendar_v3.Calendar;

  constructor(private appConfigService: AppConfigService) {
    const {
      calendarServiceOptions: config,
      serviceAccountJsonContent: keyFileContent,
      serviceAccountJsonKeyFilePathname: keyFilePath,
      userEmail,
    } = this.appConfigService.getConfig().googleApis || {};
    if (!config) {
      throw new Error('Google API calendar options are not configured');
    }
    if (!config.scopes || config.scopes.length === 0) {
      throw new Error('Google API calendar scopes are not configured');
    }
    const { scopes } = config;
    this.service = this.createCalendarServiceFromKeyFilePathOrContent(
      keyFilePath,
      keyFileContent,
      userEmail,
      scopes,
    );
  }

  /**
   * Create Google Calendar API service from service account key file
   */
  createCalendarServiceFromKeyFilePathOrContent(
    keyFilePath?: string,
    keyFileContent?: string,
    userEmail?: string,
    scopes?: string[],
  ): calendar_v3.Calendar {
    try {
      const keyFile = path.resolve(keyFilePath || '');
      /* if (!fs.existsSync(keyFile)) {
        throw new Error(`Service account key file not found: ${keyFile}`);
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
      } else if (keyFileContent) {
        // Parse the JSON content to ensure it's valid
        const credentials = JSON.parse(
          keyFileContent,
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
      return google.calendar({
        version: 'v3',
        auth: jwtClient,
      });
    } catch (error) {
      this.logger.error(
        'Failed to create Calendar API service from key file',
        error,
      );
      throw error;
    }
  }

  /**
   * Fetches the user's calendars using the Google Calendar API.
   */
  async getCalendarList(): Promise<calendar_v3.Schema$CalendarList | null> {
    try {
      const response = await this.service.calendarList.list();
      return response.data || null;
    } catch (error) {
      this.logger.error('Failed to fetch calendars', error);
      throw error;
    }
  }

  /**
   * Fetches details of a specific calendar by its ID using the Google Calendar API.
   */
  async getCalendarById(
    calendarId: string,
  ): Promise<calendar_v3.Schema$Calendar | null> {
    try {
      const response = await this.service.calendars.get({ calendarId });
      return response.data || null;
    } catch (error) {
      this.logger.error(
        `Failed to fetch calendar details for ID: ${calendarId}`,
        error,
      );
      throw error;
    }
  }

  async getCalendarEventList(
    calendarId: string,
  ): Promise<GetGoogleCalendarListDto> {
    try {
      const response = await this.service.events.list({ calendarId });
      return {
        items: response.data.items || [],
        length: response.data.items?.length || 0,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch events for calendar ID: ${calendarId}`,
        error,
      );
      throw error;
    }
  }

  async searchCalendarEventList(
    calendarId: string,
    query: string,
  ): Promise<GetGoogleCalendarListDto> {
    try {
      const list = await this.getCalendarEventList(calendarId);
      const result =
        list.items.filter((item) => item.summary?.includes(query)) || [];
      return {
        items: result,
        length: result.length || 0,
      };
    } catch (error) {
      this.logger.error(
        `Failed to search events for calendar ID: ${calendarId} with query: ${query}`,
        error,
      );
      throw error;
    }
  }

  async getCalendarEvent(
    eventId: string,
    calendarId: string,
  ): Promise<calendar_v3.Schema$Event | null> {
    try {
      const response = await this.service.events.get({ calendarId, eventId });
      return response.data || null;
    } catch (error) {
      this.logger.error(
        `Failed to fetch event ID: ${eventId} for calendar ID: ${calendarId}`,
        error,
      );
      throw error;
    }
  }

  async deleteCalendarEvent(
    eventId: string,
    calendarId: string,
  ): Promise<void> {
    try {
      await this.service.events.delete({ calendarId, eventId });
    } catch (error) {
      this.logger.error(
        `Failed to delete event ID: ${eventId} for calendar ID: ${calendarId}`,
        error,
      );
      throw error;
    }
  }

  async deleteCalendarEventBatch(
    calendarId: string,
    eventIds: string[],
  ): Promise<CalendarEventDeleteBatchPostResponseDto> {
    const result: CalendarEventDeleteBatchPostResponseDto = { results: [] };
    for (const eventId of eventIds) {
      try {
        await this.deleteCalendarEvent(eventId, calendarId);
        result.results.push({ eventId, success: true });
      } catch (error) {
        this.logger.error(
          `Failed to delete event ID: ${eventId} for calendar ID: ${calendarId} in batch operation`,
          error,
        );
        result.results.push({ eventId, success: false });
        // Continue with next eventId
      }
    }
    return result;
  }

  async createCalendarEvent(requestDto: {
    calendarId: string;
    event: GoogleCalendarEventDto;
    sendUpdates?: boolean;
    createConference?: boolean;
  }): Promise<CalendarEventCreatePostResponseDto> {
    const { calendarId, event, sendUpdates, createConference } = requestDto;
    try {
      const requestBody = {
        summary: event.summary,
        description: event.description,
        start: event.start,
        end: event.end,
        location: event.location,
        attendees: event.attendees,
      } as calendar_v3.Schema$Event;
      const request = {
        calendarId,
        requestBody,
        sendUpdates: sendUpdates ? 'all' : 'none',
      } as calendar_v3.Params$Resource$Events$Insert;
      if (createConference) {
        // Add conference data to the created event
        const conferenceRequestBody = {
          conferenceData: {
            createRequest: {
              requestId: `meet-${Date.now()}`,
            },
          },
        } as calendar_v3.Schema$Event;

        // NOTE: The following commented code is an alternative approach to add conference data after event creation
        /* await this.service.events.patch({
          calendarId,
          eventId: response.data.id!,
          requestBody: conferenceRequestBody,
        }); */

        request.requestBody = {
          ...requestBody,
          ...conferenceRequestBody,
        };
        request.conferenceDataVersion = 1;
      }
      const response = await this.service.events.insert(request);
      return {
        event: response.data,
        meta: { message: 'Event created successfully', success: true },
      } as CalendarEventCreatePostResponseDto;
    } catch (error) {
      this.logger.error(
        `Failed to create event for calendar ID: ${calendarId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Partially updates a calendar event using events.patch (only fields provided in eventDto are updated).
   */

  /**
   * Patch event details (fields) only. Does not modify conference data.
   */
  async patchCalendarEventDetail(
    eventId: string,
    calendarId: string,
    eventDto: Partial<GoogleCalendarEventDto>,
    sendUpdates: 'all' | 'externalOnly' | 'none' = 'none',
  ): Promise<calendar_v3.Schema$Event> {
    if (!eventDto || Object.keys(eventDto).length === 0) {
      throw new Error(
        'At least one field must be provided to update the event.',
      );
    }
    try {
      const response = await this.service.events.patch({
        calendarId,
        eventId,
        requestBody: eventDto,
        sendUpdates,
      });
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to patch event details for event ID: ${eventId} in calendar ID: ${calendarId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Patch only the conference data (add or remove Google Meet link).
   * If addConference is true, adds a Meet link; if false, removes conference data.
   */
  async patchCalendarEventConference(
    eventId: string,
    calendarId: string,
    createConference: boolean,
    sendUpdates: 'all' | 'externalOnly' | 'none' = 'none',
  ): Promise<calendar_v3.Schema$Event> {
    try {
      let requestBody: Partial<calendar_v3.Schema$Event>;
      let conferenceDataVersion: number | undefined = undefined;
      if (createConference) {
        requestBody = {
          conferenceData: {
            createRequest: {
              requestId: `meet-${Date.now()}`,
            },
          },
        };
        conferenceDataVersion = 1;
      } else {
        requestBody = { conferenceData: undefined };
      }
      const response = await this.service.events.patch({
        calendarId,
        eventId,
        requestBody,
        sendUpdates,
        ...(conferenceDataVersion ? { conferenceDataVersion } : {}),
      });
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to patch conference for event ID: ${eventId} in calendar ID: ${calendarId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Patch only the conference data (add or remove Google Meet link).
   * If addConference is true, adds a Meet link; if false, removes conference data.
   */
  async patchCalendarEvent(
    eventId: string,
    calendarId: string,
    event?: Partial<GoogleCalendarEventDto>,
    createConference?: boolean,
    sendUpdates: 'all' | 'externalOnly' | 'none' = 'none',
  ): Promise<calendar_v3.Schema$Event> {
    try {
      const request = {
        eventId,
        calendarId,
        sendUpdates,
      } as calendar_v3.Params$Resource$Events$Patch;
      // A bug disallows null assignment to conferenceData, so we build the object implicitly
      let requestBody = {}; // as Partial<calendar_v3.Schema$Event>;
      if (event && Object.keys(event).length > 0) {
        requestBody = { ...event };
      }
      let conferenceDataResult = 'No changes to';
      if (createConference === true) {
        // A bug in the api does not allow nulls, so we need to avoid typing with
        /* requestBody.conferenceData = {
          createRequest: {
            requestId: `meet-${Date.now()}`,
          },
        }; */
        requestBody = {
          ...requestBody,
          conferenceData: {
            createRequest: {
              requestId: `meet-${Date.now()}`,
            },
          },
        };
        request.conferenceDataVersion = 1;
        conferenceDataResult = 'Added';
      } else if (createConference === false) {
        requestBody = { ...requestBody, conferenceData: null };
        request.conferenceDataVersion = 1;
        conferenceDataResult = 'Removed';
      }
      this.logger.log(
        `${conferenceDataResult} conference data for event ID: ${eventId} in calendar ID: ${calendarId}`,
      );
      request.requestBody = requestBody;
      this.logger.log(
        `Patching event ID: ${eventId} in calendar ID: ${calendarId} with request: ${JSON.stringify(request)}`,
      );
      const response = await this.service.events.patch(request);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to patch with event ID: ${eventId} and calendar ID: ${calendarId}`,
        error,
      );
      throw error;
    }
  }

  /* async updateCalendarEvent(
    eventId: string,
    calendarId: string,
    event: GoogleCalendarEventDto,
  ): Promise<calendar_v3.Schema$Event> {
    try {
      const existing = await this.getCalendarEvent(eventId, calendarId);
      if (!existing) {
        throw new Error(
          `Event ID: ${eventId} not found in calendar ID: ${calendarId}`,
        );
      }
      const requestBody = {
        ...existing,
        summary: event.summary,
        description: event.description,
        start: event.start,
        end: event.end,
        location: event.location,
        attendees: event.attendees,
      } as calendar_v3.Schema$Event;
      const request = {
        calendarId,
        eventId,
        requestBody,
      } as calendar_v3.Params$Resource$Events$Update;
      const response = await this.service.events.update(request);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to update event ID: ${eventId} for calendar ID: ${calendarId}`,
        error,
      );
      throw error;
    }
  } */
}
