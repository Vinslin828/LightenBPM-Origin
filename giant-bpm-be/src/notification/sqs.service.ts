import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SQSClient,
  SendMessageCommand,
  SendMessageCommandInput,
} from '@aws-sdk/client-sqs';
import { NotificationMessage } from './dto/notification-message.dto';

/**
 * SQS Service
 *
 * Handles sending messages to AWS SQS queues
 */
@Injectable()
export class SqsService {
  private readonly logger = new Logger(SqsService.name);
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    // AWS Configuration
    const region = this.configService.get<string>(
      'AWS_REGION',
      'ap-northeast-1',
    );
    this.queueUrl = this.configService.get<string>(
      'AWS_SQS_NOTIFICATION_QUEUE_URL',
      '',
    );
    this.enabled =
      this.configService.get<string>('NOTIFICATION_ENABLED', 'false') ===
      'true';

    // Initialize SQS Client
    this.sqsClient = new SQSClient({
      region,
      // Credentials will be auto-loaded from environment or IAM role
    });

    if (!this.enabled) {
      this.logger.warn('Notification service is disabled');
    } else if (!this.queueUrl) {
      this.logger.error(
        'AWS_SQS_NOTIFICATION_QUEUE_URL is not set. Notifications will fail.',
      );
    } else {
      this.logger.log(`SQS Service initialized. Queue URL: ${this.queueUrl}`);
    }
  }

  /**
   * Send a notification message to SQS
   * @param message - The notification message to send
   * @returns The message ID from SQS, or null if disabled/failed
   */
  async sendMessage(message: NotificationMessage): Promise<string | null> {
    // Skip if notifications are disabled
    if (!this.enabled) {
      this.logger.debug(
        `Notifications disabled. Would have sent: ${message.type}`,
      );
      return null;
    }

    // Validate queue URL
    if (!this.queueUrl) {
      this.logger.error('Cannot send message: Queue URL not configured');
      return null;
    }

    try {
      const params: SendMessageCommandInput = {
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(message),
        // Optional: Add message attributes for filtering
        MessageAttributes: {
          NotificationType: {
            DataType: 'String',
            StringValue: message.type,
          },
        },
      };

      const command = new SendMessageCommand(params);
      const result = await this.sqsClient.send(command);

      this.logger.log(
        `Message sent to SQS. Type: ${message.type}, MessageId: ${result.MessageId}`,
      );

      return result.MessageId ?? null;
    } catch (error) {
      this.logger.error(
        `Failed to send message to SQS. Type: ${message.type}`,
        error instanceof Error ? error.stack : String(error),
      );
      // Don't throw - we don't want notification failures to break the main flow
      return null;
    }
  }
}
