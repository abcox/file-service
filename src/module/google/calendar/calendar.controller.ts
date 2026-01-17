import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  //Put,
  Query,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { calendar_v3 } from 'googleapis';
import { Auth } from '../../auth';
import { ApiBody, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { GetGoogleCalendarListDto } from './dto/get-calendar-event-list.dto';
import { CalendarEventDeleteBatchPostRequestDto } from './dto/calendar-event-delete-batch-post-request.dto';
import { CalendarEventDeleteBatchPostResponseDto } from './dto/calendar-event-delete-batch-post-response.dto';
import { CalendarEventCreatePostResponseDto } from './dto/calendar-event-create-post-response.dto';
import { CalendarEventCreatePostRequestDto } from './dto/calendar-event-create-post-request.dto';
//import { GoogleCalendarEventDto } from './dto/google-calendar-event.dto';
import { CalendarEventPatchDetailRequestDto } from './dto/calendar-event-patch-detail-request.dto';
import { CalendarEventPatchConferenceRequestDto } from './dto/calendar-event-patch-conference-request.dto';
import { CalendarEventPatchRequestDto } from './dto/calendar-event-patch-request.dto';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('list')
  @ApiOperation({
    summary: 'Get Calendar List',
    description: 'Fetches the list of calendars for the configured user.',
  })
  @Auth({ roles: ['admin'] })
  async getCalendars(): Promise<calendar_v3.Schema$CalendarList | null> {
    return this.calendarService.getCalendarList();
  }

  @Get(':id')
  @Auth({ roles: ['admin'] })
  @ApiOperation({
    summary: 'Get Calendar by ID',
    description: 'Given a Calendar ID, fetches the calendar details.',
  })
  async getCalendarById(
    @Param('id') id: string,
  ): Promise<calendar_v3.Schema$Calendar | null> {
    return this.calendarService.getCalendarById(id);
  }

  @Get(':id/event/list')
  @ApiOperation({
    summary: 'Get Calendar Event List',
    description: 'Given a Calendar ID, fetches its list of events.',
  })
  @Auth({ roles: ['admin'] })
  async getCalendarEventList(
    @Param('id') id: string,
  ): Promise<GetGoogleCalendarListDto> {
    return this.calendarService.getCalendarEventList(id);
  }

  @Get(':id/event/search')
  @ApiOperation({
    summary: 'Search Calendar Event List',
    description:
      'Given a Calendar ID and a query string, fetches its list of events matching the query.',
  })
  @Auth({ roles: ['admin'] })
  @ApiQuery({
    name: 'query',
    required: true,
    description: 'Search query string to filter events by summary',
    example: 'Meeting',
  })
  async searchCalendarEventList(
    @Param('id') id: string,
    @Query('query') query: string,
  ): Promise<GetGoogleCalendarListDto> {
    return this.calendarService.searchCalendarEventList(id, query);
  }

  @Get(':calendarId/event/:eventId')
  @ApiOperation({
    summary: 'Get Calendar Event',
    description: 'Given a Calendar ID and Event ID, fetches the event details.',
  })
  @Auth({ roles: ['admin'] })
  async getCalendarEvent(
    @Param('calendarId') calendarId: string,
    @Param('eventId') eventId: string,
  ): Promise<calendar_v3.Schema$Event | null> {
    return this.calendarService.getCalendarEvent(eventId, calendarId);
  }

  @Delete(':calendarId/event/:eventId')
  @ApiOperation({
    summary: 'Delete Calendar Event',
    description: 'Given a Calendar ID and Event ID, deletes the event.',
  })
  @Auth({ roles: ['admin'] })
  async deleteCalendarEvent(
    @Param('calendarId') calendarId: string,
    @Param('eventId') eventId: string,
  ): Promise<void> {
    return this.calendarService.deleteCalendarEvent(eventId, calendarId);
  }

  @Post(':id/event/delete/batch')
  @ApiOperation({
    summary: 'Batch Delete Calendar Events',
    description:
      'Given a Calendar ID and a list of Event IDs, deletes the events in batch.',
  })
  @Auth({ roles: ['admin'] })
  async deleteCalendarEventBatch(
    @Param('id') id: string,
    @Body() deleteRequestDto: CalendarEventDeleteBatchPostRequestDto,
  ): Promise<CalendarEventDeleteBatchPostResponseDto> {
    const results = this.calendarService.deleteCalendarEventBatch(
      id,
      deleteRequestDto.eventIds,
    );
    return results;
  }

  @Post(':id/event/create')
  @ApiOperation({
    summary: 'Create Calendar Event',
    description: 'Creates a new event in the specified calendar.',
  })
  @Auth({ roles: ['admin'] })
  async createCalendarEvent(
    @Param('id') id: string,
    @Body()
    request: CalendarEventCreatePostRequestDto,
  ): Promise<CalendarEventCreatePostResponseDto> {
    const { event } = request;
    return this.calendarService.createCalendarEvent({
      calendarId: id,
      event,
      sendUpdates: request.sendUpdates,
      createConference: request.createConference,
    });
  }

  @Patch(':calendarId/event/:eventId/detail')
  @ApiOperation({
    summary: 'Patch Calendar Event Details',
    description:
      'Patches event details (fields) in the specified calendar. Only include the fields to be updated in the request body.',
  })
  @Auth({ roles: ['admin'] })
  async patchCalendarEventDetail(
    @Param('calendarId') calendarId: string,
    @Param('eventId') eventId: string,
    @Body() request: CalendarEventPatchDetailRequestDto,
  ): Promise<calendar_v3.Schema$Event> {
    const { event, sendUpdates } = request;
    return this.calendarService.patchCalendarEventDetail(
      eventId,
      calendarId,
      event,
      sendUpdates || 'none',
    );
  }

  @Patch(':calendarId/event/:eventId/conference')
  @ApiOperation({
    summary: 'Patch Calendar Event Conference',
    description:
      'Adds or removes a Google Meet link for the event. Use addConference=true to add, false to remove.',
  })
  @Auth({ roles: ['admin'] })
  @ApiBody({ type: CalendarEventPatchConferenceRequestDto })
  async patchCalendarEventConference(
    @Param('calendarId') calendarId: string,
    @Param('eventId') eventId: string,
    @Body()
    request: CalendarEventPatchConferenceRequestDto,
  ): Promise<calendar_v3.Schema$Event> {
    const { createConference, sendUpdates } = request;
    return this.calendarService.patchCalendarEventConference(
      eventId,
      calendarId,
      createConference,
      sendUpdates || 'none',
    );
  }

  @Patch(':calendarId/event/:eventId')
  @ApiOperation({
    summary: 'Patch Calendar Event',
    description:
      'Patches calendar event details and/or adds conference. Only include the fields to be updated in the request body. Must include either at least 1 event detail property or createConference flag.',
  })
  @Auth({ roles: ['admin'] })
  @ApiBody({ type: CalendarEventPatchRequestDto })
  async patchCalendarEvent(
    @Param('calendarId') calendarId: string,
    @Param('eventId') eventId: string,
    @Body()
    request: CalendarEventPatchRequestDto,
  ): Promise<calendar_v3.Schema$Event> {
    const { createConference, event, sendUpdates } = request;
    return this.calendarService.patchCalendarEvent(
      eventId,
      calendarId,
      event,
      createConference,
      sendUpdates || 'none',
    );
  }

  /* @Put(':calendarId/event/:eventId')
  @ApiOperation({
    summary: 'Update Calendar Event',
    description: 'Updates an existing event in the specified calendar.',
  })
  @Auth({ roles: ['admin'] })
  async updateCalendarEvent(
    @Param('calendarId') calendarId: string,
    @Param('eventId') eventId: string,
    @Body() event: GoogleCalendarEventDto,
  ): Promise<calendar_v3.Schema$Event> {
    return this.calendarService.updateCalendarEvent(eventId, calendarId, event);
  } */
}
