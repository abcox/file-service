import { Injectable, Logger } from '@nestjs/common';
import { google, calendar_v3 } from 'googleapis';
//import { GaxiosResponseWithHTTP2 } from 'googleapis-common';
import * as fs from 'fs';
import * as path from 'path';
import { AppConfigService } from '../../config/config.service';
import { GetGoogleCalendarListDto } from './dto/get-calendar-event-list.dto';
import { CalendarEventDeleteBatchPostResponseDto } from './dto/calendar-event-delete-batch-post-response.dto';
import { CalendarEventCreatePostResponseDto } from './dto/calendar-event-create-post-response.dto';
import { GoogleCalendarEventDto } from './dto/google-calendar-event.dto';

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
    this.service = this.createCalendarServiceFromKeyFile(
      keyFilePath,
      userEmail,
      scopes,
    );
  }

  /**
   * Create Google Calendar API service from service account key file
   */
  createCalendarServiceFromKeyFile(
    keyFilePath?: string,
    userEmail?: string,
    scopes?: string[],
  ): calendar_v3.Calendar {
    try {
      const keyFile = path.resolve(keyFilePath || '');
      if (!fs.existsSync(keyFile)) {
        throw new Error(`Service account key file not found: ${keyFile}`);
      }
      if (!userEmail) {
        throw new Error(
          'User email for domain-wide delegation is not configured',
        );
      }
      const jwtClient = new google.auth.JWT({
        keyFile: keyFile,
        scopes,
        subject: userEmail, // Domain user to impersonate
      });
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

  async createCalendarEvent(request: {
    calendarId: string;
    event: GoogleCalendarEventDto;
    sendUpdates?: boolean;
  }): Promise<CalendarEventCreatePostResponseDto> {
    const { calendarId, event, sendUpdates } = request;
    try {
      const requestBody = {
        summary: event.summary,
        description: event.description,
        start: event.start,
        end: event.end,
        location: event.location,
        attendees: event.attendees,
      } as calendar_v3.Schema$Event;
      const response = await this.service.events.insert({
        calendarId,
        requestBody: requestBody,
        sendUpdates: sendUpdates ? 'all' : 'none',
      });
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
}
