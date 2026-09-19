import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.guard';
import { SchedulerService } from './scheduler.service';

type UpdateSchedulerJobMetadataRequest = {
  description?: string;
};

type UpdateSchedulerJobConfigRequest = {
  enabled?: boolean;
  cron?: string;
  timeZone?: string;
};

@ApiTags('Scheduler')
@Controller('scheduler')
@Auth({ roles: ['admin'] })
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get scheduler runtime status' })
  @ApiResponse({ status: 200, description: 'Scheduler status snapshot' })
  async getStatus() {
    return {
      status: await this.schedulerService.getStatus(),
    };
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List configured/registered scheduler jobs' })
  @ApiResponse({ status: 200, description: 'Scheduler jobs list' })
  async getJobs() {
    return {
      jobs: await this.schedulerService.listJobs(),
    };
  }

  @Post('reload')
  @ApiOperation({
    summary: 'Reload scheduler job schedules from DB-backed config',
  })
  @ApiResponse({ status: 200, description: 'Scheduler reload summary' })
  async reloadScheduler() {
    return {
      reload: await this.schedulerService.reloadJobSchedules(),
    };
  }

  @Post('jobs/sync-metadata')
  @Auth({ roles: ['admin'], claims: { type: 'system' } })
  @ApiOperation({
    summary:
      'Sync code-registered jobs into the DB metadata store; source of truth remains code',
  })
  @ApiResponse({ status: 200, description: 'Scheduler metadata sync result' })
  async syncJobMetadata() {
    return {
      sync: await this.schedulerService.syncRegisteredJobsMetadata(),
      warning:
        'Job metadata is code-owned. Changes to description/job label should be made in the implementation, not through external config updates.',
    };
  }

  @Post('jobs/:jobName/metadata')
  @Auth({ roles: ['admin'], claims: { type: 'system' } })
  @ApiOperation({
    summary:
      'Update code-owned metadata for a scheduler job via protected system flow',
  })
  @ApiResponse({ status: 200, description: 'Metadata update response' })
  async updateJobMetadata(
    @Param('jobName') jobName: string,
    @Body() body: UpdateSchedulerJobMetadataRequest,
  ) {
    return {
      warning:
        'Job metadata is managed by code as source of truth. Prefer updating the implementation description instead of external DB metadata.',
      result: await this.schedulerService.upsertJobConfig(jobName, {
        enabled: undefined,
        cron: undefined,
        timeZone: undefined,
      }),
      metadata: body,
    };
  }

  @Post('jobs/:jobName/run')
  @ApiOperation({ summary: 'Manually invoke a scheduler job' })
  @ApiParam({
    name: 'jobName',
    description: 'Scheduler job name, for example funnel.invite-pilot',
  })
  @ApiResponse({ status: 200, description: 'Manual run request executed' })
  async runJob(@Param('jobName') jobName: string) {
    return {
      result: await this.schedulerService.runJobNow(jobName),
    };
  }

  @Post('jobs/:jobName/enable')
  @ApiOperation({ summary: 'Enable a scheduler job via DB-backed config' })
  @ApiParam({
    name: 'jobName',
    description: 'Scheduler job name, for example funnel.invite-pilot',
  })
  @ApiResponse({
    status: 200,
    description: 'Job enabled and scheduler reloaded',
  })
  async enableJob(@Param('jobName') jobName: string) {
    return {
      result: await this.schedulerService.setJobEnabled(jobName, true),
    };
  }

  @Post('jobs/:jobName/disable')
  @ApiOperation({ summary: 'Disable a scheduler job via DB-backed config' })
  @ApiParam({
    name: 'jobName',
    description: 'Scheduler job name, for example funnel.invite-pilot',
  })
  @ApiResponse({
    status: 200,
    description: 'Job disabled and scheduler reloaded',
  })
  async disableJob(@Param('jobName') jobName: string) {
    return {
      result: await this.schedulerService.setJobEnabled(jobName, false),
    };
  }

  @Post('jobs/:jobName/config')
  @ApiOperation({
    summary: 'Update scheduler job config in DB and reload schedules',
  })
  @ApiParam({
    name: 'jobName',
    description: 'Scheduler job name, for example funnel.invite-pilot',
  })
  @ApiResponse({
    status: 200,
    description: 'Job config updated and scheduler reloaded',
  })
  async updateJobConfig(
    @Param('jobName') jobName: string,
    @Body() body: UpdateSchedulerJobConfigRequest,
  ) {
    return {
      result: await this.schedulerService.upsertJobConfig(jobName, body),
    };
  }
}
