import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppConfigService } from '../../config/config.service';
import { GmailService } from '../../gmail/gmail.service';
import { LoggerService } from '../../logger/logger.service';
import { SchedulerJobRegistryService } from '../scheduler-job-registry.service';
import { SchedulerJob, SchedulerJobContext } from '../scheduler-job.interface';
import {
  InvitePilotConfigResolved,
  resolveInvitePilotConfig,
} from '../scheduler-config.resolver';

@Injectable()
export class InvitePilotSchedulerJob implements SchedulerJob, OnModuleInit {
  readonly name = 'funnel.invite-pilot';

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly gmailService: GmailService,
    private readonly logger: LoggerService,
    private readonly schedulerJobRegistry: SchedulerJobRegistryService,
  ) {}

  onModuleInit(): void {
    this.schedulerJobRegistry.register(this);
  }

  async execute(context: SchedulerJobContext): Promise<void> {
    const config = this.getInvitePilotConfig();

    context.reportProgress({
      eventType: 'job_progress',
      step: 'invite-pilot-config-loaded',
      message: 'Invite pilot configuration loaded',
      meta: {
        enabled: config.enabled,
        hasRecipientEmail: Boolean(config.recipientEmail),
        hasSenderEmail: Boolean(config.senderEmail),
        hasFunnelBaseUrl: Boolean(config.funnelBaseUrl),
      },
    });

    if (!config.enabled) {
      context.reportProgress({
        eventType: 'job_progress',
        step: 'invite-pilot-skipped',
        message: 'Invite pilot disabled by configuration',
      });
      return;
    }

    if (
      !config.recipientEmail ||
      !config.senderEmail ||
      !config.funnelBaseUrl
    ) {
      context.reportProgress({
        eventType: 'job_progress',
        step: 'invite-pilot-misconfigured',
        message:
          'Missing recipientEmail, senderEmail, or funnelBaseUrl in funnel.invitation config (or legacy scheduler.invitePilot)',
      });
      return;
    }

    context.reportProgress({
      eventType: 'job_progress',
      step: 'invite-pilot-config-validated',
      message: 'Invite pilot configuration validated',
    });

    context.reportProgress({
      eventType: 'job_progress',
      step: 'invite-pilot-url-build-started',
      message: 'Building invite URL with attribution parameters',
    });

    const inviteUrl = this.buildInviteUrl(config);

    context.reportProgress({
      eventType: 'job_progress',
      step: 'invite-pilot-url-build-completed',
      message: 'Invite URL built successfully',
      meta: {
        inviteUrl,
      },
    });

    context.reportProgress({
      eventType: 'job_progress',
      step: 'invite-pilot-email-send-started',
      message: 'Sending invite pilot email',
      meta: {
        recipientEmail: config.recipientEmail,
        channel: config.channel,
        campaignType: config.campaignType,
        campaignId: config.campaignId,
      },
    });

    context.reportProgress({
      eventType: 'job_progress',
      step: 'invite-pilot-email-payload-build-started',
      message: 'Building invite pilot email payload',
    });

    const subject = `${config.subjectPrefix} Funnel Invite Pilot`;
    const textBody = [
      'This is a scheduler invite pilot message.',
      '',
      `Run ID: ${context.runId}`,
      `Channel: ${config.channel}`,
      `Campaign Type: ${config.campaignType}`,
      `Campaign ID: ${config.campaignId}`,
      '',
      `Funnel Link: ${inviteUrl}`,
    ].join('\n');

    const htmlBody = [
      '<h2>Scheduler Invite Pilot</h2>',
      `<p>Run ID: <strong>${context.runId}</strong></p>`,
      `<p>Channel: <strong>${config.channel}</strong></p>`,
      `<p>Campaign Type: <strong>${config.campaignType}</strong></p>`,
      `<p>Campaign ID: <strong>${config.campaignId}</strong></p>`,
      `<p><a href="${inviteUrl}">Open funnel link</a></p>`,
    ].join('');

    context.reportProgress({
      eventType: 'job_progress',
      step: 'invite-pilot-email-payload-build-completed',
      message: 'Invite pilot email payload built',
      meta: {
        subject,
        htmlLength: htmlBody.length,
      },
    });

    const result = await this.gmailService.sendSimpleEmail(
      config.senderEmail,
      config.recipientEmail,
      subject,
      htmlBody || textBody,
      true,
    );

    if (!result.success) {
      this.logger.error(
        'Invite pilot scheduler job failed to send email',
        result.error ? new Error(result.error) : undefined,
        {
          jobName: this.name,
          runId: context.runId,
          recipientEmail: config.recipientEmail,
        },
      );
      throw new Error(result.error || 'Invite pilot email send failed');
    }

    context.reportProgress({
      eventType: 'job_progress',
      step: 'invite-pilot-email-send-completed',
      message: 'Invite pilot email sent successfully',
      meta: {
        messageId: result.messageId,
        threadId: result.threadId,
        inviteUrl,
      },
    });
  }

  private buildInviteUrl(config: InvitePilotConfigResolved): string {
    const base = config.funnelBaseUrl;
    const url = new URL(base);

    url.searchParams.set('src', config.channel);
    url.searchParams.set('campaignType', config.campaignType);
    url.searchParams.set('campaignId', config.campaignId);
    url.searchParams.set('utm_source', config.campaignType);
    url.searchParams.set('utm_medium', 'scheduler');
    url.searchParams.set('utm_campaign', config.campaignId);

    return url.toString();
  }

  private getInvitePilotConfig(): InvitePilotConfigResolved {
    return resolveInvitePilotConfig(this.appConfigService.getConfig());
  }
}
