import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { calendar_v3 } from 'googleapis';
import { Auth } from '../../auth';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';
import { GetGoogleCalendarListDto } from './dto/get-calendar-event-list.dto';
import { CalendarEventDeleteBatchPostRequestDto } from './dto/calendar-event-delete-batch-post-request.dto';
import { CalendarEventDeleteBatchPostResponseDto } from './dto/calendar-event-delete-batch-post-response.dto';
import { CalendarEventCreatePostResponseDto } from './dto/calendar-event-create-post-response.dto';
import { CalendarEventCreatePostRequestDto } from './dto/calendar-event-create-post-request.dto';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('list')
  @ApiOperation({
    summary: 'Get Calendar List',
    description: 'Fetches the list of calendars for the configured user.',
  })
  @Auth({ public: true })
  async getCalendars(): Promise<calendar_v3.Schema$CalendarList | null> {
    return this.calendarService.getCalendarList();
  }

  @Get(':id')
  @Auth({ public: true })
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
  @Auth({ public: true })
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
  @Auth({ public: true })
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
  @Auth({ public: true })
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
  @Auth({ public: true })
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
  @Auth({ public: true })
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
  @Auth({ public: true })
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
    });
  }
}
