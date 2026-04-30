/**
 * Notification Processor Lambda
 *
 * Processes notification messages from SQS and sends emails via SES SMTP.
 * Triggered by SQS events from the NotificationQueue.
 */

import nodemailer from 'nodemailer';

// Email configuration
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'no-reply-bpm@uat.giantcycling.com';
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'https://d1eyiey7sfco8o.cloudfront.net';
const SMTP_HOST = process.env.SMTP_HOST || 'email-smtp.ap-northeast-1.amazonaws.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';

// Initialize SMTP transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false, // true for 465, false for other ports (587 uses STARTTLS)
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD,
  },
});

/**
 * Lambda handler for processing SQS notification messages
 * @param {import('aws-lambda').SQSEvent} event - SQS event containing notification messages
 */
export const handler = async (event) => {
  console.log(`Received SQS event with ${event.Records.length} record(s)`);

  const stage = process.env.STAGE || 'dev';
  console.log(`Running in stage: ${stage}`);

  // Process each SQS record
  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      console.log(`Processing notification: type=${message.type}, timestamp=${message.timestamp}`);

      await processNotification(message, stage);
    } catch (error) {
      console.error('Error processing SQS record:', error);
      console.error('Record body:', record.body);
      // Re-throw to trigger SQS retry mechanism
      throw error;
    }
  }

  console.log(`Successfully processed ${event.Records.length} notification(s)`);
};

/**
 * Process a single notification message
 * @param {Object} message - Notification message with type and data
 * @param {string} stage - Deployment stage (dev, staging, uat, prod)
 */
async function processNotification(message, stage) {
  const { type, data, timestamp } = message;

  console.log(`Processing notification type: ${type}`);
  console.log(`Timestamp: ${timestamp}`);

  switch (type) {
    case 'APPROVAL_TASK_PENDING':
      await sendApprovalTaskPendingEmail(data, stage);
      break;

    case 'APPROVAL_TASK_APPROVED':
      await sendApprovalDecisionEmail(data, 'APPROVED', stage);
      break;

    case 'APPROVAL_TASK_REJECTED':
      await sendApprovalDecisionEmail(data, 'REJECTED', stage);
      break;

    case 'WORKFLOW_COMPLETED':
      await sendWorkflowCompletedEmail(data, stage);
      break;

    default:
      console.warn(`Unknown notification type: ${type}`);
      // Don't throw error for unknown types (prevents infinite retry)
      break;
  }
}

/**
 * Send email for pending approval task
 * @param {Object} data - Approval task pending data
 * @param {string} stage - Deployment stage
 */
async function sendApprovalTaskPendingEmail(data, stage) {
  const subject = `[${stage.toUpperCase()}] New Approval Task: ${data.workflowName}`;
  const htmlBody = generatePendingTaskEmailHtml(data, stage);

  await sendEmail(data.assigneeEmail, subject, htmlBody);

  console.log(`✅ Email sent to: ${data.assigneeEmail}`);
}

/**
 * Send email for approval decision (APPROVED/REJECTED)
 * @param {Object} data - Approval decision data
 * @param {string} decision - APPROVED or REJECTED
 * @param {string} stage - Deployment stage
 */
async function sendApprovalDecisionEmail(data, decision, stage) {
  const subject = `[${stage.toUpperCase()}] Approval ${decision}: ${data.workflowName}`;
  const htmlBody = generateDecisionEmailHtml(data, decision, stage);

  await sendEmail(data.applicantEmail, subject, htmlBody);

  console.log(`✅ Email sent to: ${data.applicantEmail}`);
}

/**
 * Send email for workflow completion
 * @param {Object} data - Workflow completed data
 * @param {string} stage - Deployment stage
 */
async function sendWorkflowCompletedEmail(data, stage) {
  const subject = `[${stage.toUpperCase()}] Workflow Completed: ${data.workflowName}`;
  const htmlBody = generateCompletedEmailHtml(data, stage);

  await sendEmail(data.applicantEmail, subject, htmlBody);

  console.log(`✅ Email sent to: ${data.applicantEmail}`);
}

/**
 * Send email via SES SMTP
 * @param {string} recipientEmail - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlBody - HTML email body
 */
async function sendEmail(recipientEmail, subject, htmlBody) {
  try {
    const info = await transporter.sendMail({
      from: SENDER_EMAIL,
      to: recipientEmail,
      subject,
      html: htmlBody,
    });
    console.log(`SMTP MessageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Failed to send email via SMTP:', error);
    throw error;
  }
}

/**
 * Generate HTML email for pending approval task
 */
function generatePendingTaskEmailHtml(data, stage) {
  const taskUrl = `${FRONTEND_BASE_URL}/dashboard/application/review/${data.taskId}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #2563eb; margin: 0 0 20px 0; font-size: 24px;">New Approval Task</h1>

    <div style="background-color: white; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
      <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Task Details</h2>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Workflow:</td>
          <td style="padding: 8px 0; color: #111827;">${data.workflowName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Instance:</td>
          <td style="padding: 8px 0; color: #111827;">${data.instanceSerialNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Applicant:</td>
          <td style="padding: 8px 0; color: #111827;">${data.applicantName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Assigned to:</td>
          <td style="padding: 8px 0; color: #111827;">${data.assigneeName}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${taskUrl}"
         style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Review Task
      </a>
    </div>
  </div>

  <div style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 20px;">
    <p>This is an automated notification from Giant BPM [${stage.toUpperCase()}]</p>
    <p>Please do not reply to this email</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML email for approval decision
 */
function generateDecisionEmailHtml(data, decision, stage) {
  const isApproved = decision === 'APPROVED';
  const statusColor = isApproved ? '#10b981' : '#ef4444';
  const statusBgColor = isApproved ? '#d1fae5' : '#fee2e2';
  const statusText = isApproved ? '✓ Approved' : '✗ Rejected';
  const instanceUrl = `${FRONTEND_BASE_URL}/dashboard/application/${data.instanceSerialNumber}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <div style="background-color: ${statusBgColor}; color: ${statusColor}; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px; font-weight: 600; font-size: 18px;">
      ${statusText}
    </div>

    <h1 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Approval Decision</h1>

    <div style="background-color: white; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
      <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Task Details</h2>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Workflow:</td>
          <td style="padding: 8px 0; color: #111827;">${data.workflowName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Instance:</td>
          <td style="padding: 8px 0; color: #111827;">${data.instanceSerialNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Approver:</td>
          <td style="padding: 8px 0; color: #111827;">${data.approverName}</td>
        </tr>
        ${data.comment ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500; vertical-align: top;">Comment:</td>
          <td style="padding: 8px 0; color: #111827;">${data.comment}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${instanceUrl}"
         style="display: inline-block; background-color: #6b7280; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        View Workflow Instance
      </a>
    </div>
  </div>

  <div style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 20px;">
    <p>This is an automated notification from Giant BPM [${stage.toUpperCase()}]</p>
    <p>Please do not reply to this email</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML email for workflow completion
 */
function generateCompletedEmailHtml(data, stage) {
  const isApproved = data.finalStatus === 'APPROVED';
  const statusColor = isApproved ? '#10b981' : '#ef4444';
  const statusBgColor = isApproved ? '#d1fae5' : '#fee2e2';
  const statusText = isApproved ? '✓ Completed (Approved)' : '✗ Completed (Rejected)';
  const instanceUrl = `${FRONTEND_BASE_URL}/dashboard/application/${data.instanceSerialNumber}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <div style="background-color: ${statusBgColor}; color: ${statusColor}; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px; font-weight: 600; font-size: 18px;">
      ${statusText}
    </div>

    <h1 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Workflow Completed</h1>

    <div style="background-color: white; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
      <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Workflow Details</h2>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Workflow:</td>
          <td style="padding: 8px 0; color: #111827;">${data.workflowName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Instance:</td>
          <td style="padding: 8px 0; color: #111827;">${data.instanceSerialNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Final Status:</td>
          <td style="padding: 8px 0; color: #111827; text-transform: capitalize;">${data.finalStatus}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Applicant:</td>
          <td style="padding: 8px 0; color: #111827;">${data.applicantName}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${instanceUrl}"
         style="display: inline-block; background-color: #6b7280; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        View Complete Workflow
      </a>
    </div>
  </div>

  <div style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 20px;">
    <p>This is an automated notification from Giant BPM [${stage.toUpperCase()}]</p>
    <p>Please do not reply to this email</p>
  </div>
</body>
</html>
  `.trim();
}
