import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { calendar_v3 } from 'googleapis';
import { AppConfigService } from '../config/config.service';
//import { AppConfig } from '../config/config.interface';
import { CalendarService } from '../google/calendar/calendar.service';
import { BookingAvailabilityResponseDto } from './dto/booking-availability-response.dto';
import { BookingConfigDto } from './dto/booking-config.dto';
import { BookingReserveRequestDto } from './dto/booking-reserve-request.dto';
import { BookingReserveResponseDto } from './dto/booking-reserve-response.dto';
import { BookingSlotDto } from './dto/booking-slot.dto';
import { BookingWindowDto } from './dto/booking-window.dto';

type BookingWindowConfig = BookingWindowDto;
type BookingConfig = BookingConfigDto;
type BookingSlot = BookingSlotDto;
type BookingReserveRequest = BookingReserveRequestDto;

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly calendarService: CalendarService,
  ) {}

  // TODO Option B: support runtime schedule overrides from DB/admin API.
  // TODO Option C: support per-host/per-meeting-type schedule profiles.
  private getBookingConfig(): BookingConfig {
    const config = this.appConfigService.getConfig();
    const source = config.booking;

    return {
      enabled: source?.enabled ?? true,
      includeWeekendDays: source?.includeWeekendDays ?? false,
      calendarId: source?.calendarId,
      timezone: source?.timezone ?? config.api?.timeZone ?? 'America/Toronto',
      maxDaysInFuture: source?.maxDaysInFuture ?? 21,
      slotIntervalMinutes: source?.slotIntervalMinutes ?? 15,
      defaultMeetingDurationMinutes:
        source?.defaultMeetingDurationMinutes ?? 30,
      maxMinutesPerBooking: source?.maxMinutesPerBooking ?? 60,
      workingWindows: (source?.workingWindows as BookingWindowConfig[]) ?? [
        {
          dayOfWeek: 1,
          startHour24: 9,
          endHour24: 17,
          maxMinutesPerBooking: 60,
        },
        {
          dayOfWeek: 2,
          startHour24: 9,
          endHour24: 17,
          maxMinutesPerBooking: 60,
        },
        {
          dayOfWeek: 3,
          startHour24: 9,
          endHour24: 17,
          maxMinutesPerBooking: 60,
        },
        {
          dayOfWeek: 4,
          startHour24: 9,
          endHour24: 17,
          maxMinutesPerBooking: 60,
        },
        {
          dayOfWeek: 5,
          startHour24: 9,
          endHour24: 16,
          maxMinutesPerBooking: 60,
        },
      ],
    };
  }

  async getAvailability(
    date?: string,
  ): Promise<BookingAvailabilityResponseDto> {
    const config = this.getBookingConfig();
    if (!config.enabled) {
      return {
        config,
        date: this.getDateOnlyString(new Date()),
        availableSlots: [] as BookingSlot[],
        generatedAtUtc: new Date().toISOString(),
        message: 'Booking is currently disabled.',
      };
    }

    const targetDate = this.resolveRequestedDate(date);
    this.validateDateWithinRange(targetDate, config.maxDaysInFuture);

    const calendarId = await this.resolveCalendarId(config);
    const availableSlots = await this.computeAvailableSlotsForDate(
      targetDate,
      config,
      calendarId,
      config.defaultMeetingDurationMinutes,
    );

    return {
      config,
      date: this.getDateOnlyString(targetDate),
      availableSlots,
      generatedAtUtc: new Date().toISOString(),
    };
  }

  async reserve(
    request: BookingReserveRequest,
  ): Promise<BookingReserveResponseDto> {
    if (!request.startUtc || !request.name || !request.email) {
      throw new BadRequestException(
        'startUtc, name, and email are required to reserve a slot.',
      );
    }

    const config = this.getBookingConfig();
    if (!config.enabled) {
      throw new ConflictException('Booking is currently disabled.');
    }

    const startDate = new Date(request.startUtc);
    if (Number.isNaN(startDate.getTime())) {
      throw new BadRequestException('Invalid startUtc date-time value.');
    }

    const dateOnly = this.getDateOnlyString(startDate);
    const targetDate = this.resolveRequestedDate(dateOnly);
    this.validateDateWithinRange(targetDate, config.maxDaysInFuture);

    const durationMinutes =
      request.durationMinutes ?? config.defaultMeetingDurationMinutes;
    if (durationMinutes <= 0) {
      throw new BadRequestException(
        'durationMinutes must be greater than zero.',
      );
    }
    if (durationMinutes > config.maxMinutesPerBooking) {
      throw new BadRequestException(
        `durationMinutes exceeds maxMinutesPerBooking (${config.maxMinutesPerBooking}).`,
      );
    }

    const calendarId = await this.resolveCalendarId(config);
    const availableSlots = await this.computeAvailableSlotsForDate(
      targetDate,
      config,
      calendarId,
      durationMinutes,
    );

    const matchingSlot = availableSlots.find(
      (slot) => slot.startUtc === new Date(request.startUtc).toISOString(),
    );

    if (!matchingSlot) {
      throw new ConflictException({
        message: 'The selected slot is no longer available.',
        date: this.getDateOnlyString(targetDate),
        config,
        availableSlots,
      });
    }

    const timezone = request.timezone || config.timezone;
    const subject = request.subject?.trim() || 'Meeting Invite';
    const descriptionParts = [
      request.comments?.trim() ? request.comments.trim() : '',
      request.phone?.trim() ? `Phone: ${request.phone.trim()}` : '',
    ].filter(Boolean);

    try {
      const createResult = await this.calendarService.createCalendarEvent({
        calendarId,
        event: {
          summary: subject,
          description: descriptionParts.join('\n'),
          start: {
            dateTime: matchingSlot.startUtc,
            timeZone: timezone,
          },
          end: {
            dateTime: matchingSlot.endUtc,
            timeZone: timezone,
          },
          attendees: [
            {
              email: request.email,
              displayName: request.name,
            },
          ],
        },
        sendUpdates: true,
        createConference: true,
      });

      return {
        success: true,
        event: createResult.event,
        slot: matchingSlot,
      };
    } catch (error) {
      this.logger.error('Failed to reserve booking slot', error as Error);
      throw new InternalServerErrorException('Failed to reserve booking slot.');
    }
  }

  private async computeAvailableSlotsForDate(
    targetDate: Date,
    config: BookingConfig,
    calendarId: string,
    durationMinutes: number,
  ): Promise<BookingSlot[]> {
    const dayOfWeek = targetDate.getDay();
    const windows = config.workingWindows.filter(
      (window) => window.dayOfWeek === dayOfWeek,
    );

    if (windows.length === 0) {
      return [];
    }

    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const events = await this.calendarService.getCalendarEventListInRange(
      calendarId,
      dayStart.toISOString(),
      dayEnd.toISOString(),
    );

    const busyIntervals = this.extractBusyIntervals(events);
    const now = Date.now();

    const slots: BookingSlot[] = [];
    for (const window of windows) {
      const maxForWindow =
        window.maxMinutesPerBooking ?? config.maxMinutesPerBooking;
      const slotDuration = Math.min(durationMinutes, maxForWindow);

      const windowStart = new Date(targetDate);
      windowStart.setHours(window.startHour24, 0, 0, 0);

      const windowEnd = new Date(targetDate);
      windowEnd.setHours(window.endHour24, 0, 0, 0);

      for (
        let slotStartMs = windowStart.getTime();
        slotStartMs + slotDuration * 60 * 1000 <= windowEnd.getTime();
        slotStartMs += config.slotIntervalMinutes * 60 * 1000
      ) {
        const slotStart = new Date(slotStartMs);
        const slotEnd = new Date(slotStartMs + slotDuration * 60 * 1000);

        if (slotStart.getTime() <= now) {
          continue;
        }

        if (this.overlapsBusyInterval(slotStart, slotEnd, busyIntervals)) {
          continue;
        }

        slots.push({
          startUtc: slotStart.toISOString(),
          endUtc: slotEnd.toISOString(),
          startLabel: this.formatTimeLabel(slotStart),
          durationMinutes: slotDuration,
        });
      }
    }

    return slots;
  }

  private extractBusyIntervals(events: calendar_v3.Schema$Event[]) {
    return events
      .map((event) => {
        const start = event.start?.dateTime
          ? new Date(event.start.dateTime)
          : null;
        const end = event.end?.dateTime ? new Date(event.end.dateTime) : null;
        if (!start || !end) {
          return null;
        }
        return { start, end };
      })
      .filter((interval): interval is { start: Date; end: Date } => !!interval);
  }

  private overlapsBusyInterval(
    slotStart: Date,
    slotEnd: Date,
    busyIntervals: Array<{ start: Date; end: Date }>,
  ): boolean {
    return busyIntervals.some(
      (busy) => slotStart < busy.end && slotEnd > busy.start,
    );
  }

  private formatTimeLabel(date: Date): string {
    // TODO Option B/C: use a timezone-aware date library and format by config.timezone.
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  private resolveRequestedDate(date?: string): Date {
    const value = date ? new Date(`${date}T00:00:00`) : new Date();
    if (Number.isNaN(value.getTime())) {
      throw new BadRequestException(
        'Invalid date query value. Use YYYY-MM-DD.',
      );
    }

    value.setHours(0, 0, 0, 0);
    return value;
  }

  private validateDateWithinRange(date: Date, maxDaysInFuture: number): void {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + maxDaysInFuture);

    if (date < now || date > maxDate) {
      throw new BadRequestException(
        `Requested date must be between today and ${maxDaysInFuture} days in the future.`,
      );
    }
  }

  private getDateOnlyString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async resolveCalendarId(config: BookingConfig): Promise<string> {
    if (config.calendarId) {
      return config.calendarId;
    }

    const list = await this.calendarService.getCalendarList();
    const items = list?.items ?? [];
    const primary = items.find((item) => item.primary && item.id);
    if (primary?.id) {
      return primary.id;
    }

    const first = items.find((item) => item.id);
    if (first?.id) {
      return first.id;
    }

    throw new InternalServerErrorException(
      'No calendar ID available for booking operations.',
    );
  }
}
