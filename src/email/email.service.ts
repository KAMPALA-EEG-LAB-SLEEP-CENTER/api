import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class EmailService {
  private readonly apiKey = process.env.BREVO_API_KEY;
  private readonly senderEmail = process.env.BREVO_SENDER_EMAIL;
  private readonly senderName =
    process.env.BREVO_SENDER_NAME ?? 'Kampala EEG Labs';

  async sendOtpEmail(toEmail: string, toName: string, otpCode: string) {
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { email: this.senderEmail, name: this.senderName },
        to: [{ email: toEmail, name: toName }],
        subject: 'Your Password Reset Code',
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #0B1220;">Password Reset Request</h2>
            <p style="color: #4B5563;">Use the code below to reset your admin password. This code expires in 10 minutes.</p>
            <div style="background: #F0FDFA; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
              <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0D9488;">${otpCode}</span>
            </div>
            <p style="color: #9CA3AF; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      },
      {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  async sendWelcomeEmail(
    toEmail: string,
    toName: string,
    tempPassword: string,
  ) {
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { email: this.senderEmail, name: this.senderName },
        to: [{ email: toEmail, name: toName }],
        subject: 'Your Admin Account — Kampala EEG Labs & Sleep Center',
        htmlContent: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #0B1220;">Welcome, ${toName}</h2>
          <p style="color: #4B5563;">An admin account has been created for you on the Kampala EEG Labs &amp; Sleep Center dashboard. Here are your login credentials:</p>
          <div style="background: #F0FDFA; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; color: #0B1220;"><strong>Email:</strong> ${toEmail}</p>
            <p style="margin: 0; color: #0B1220;"><strong>Temporary Password:</strong> ${tempPassword}</p>
          </div>
          <p style="color: #DC2626; font-weight: 600;">For security, please log in and change your password immediately.</p>
          <p style="color: #9CA3AF; font-size: 13px; margin-top: 24px;">If you weren't expecting this account, please contact your administrator.</p>
        </div>
      `,
      },
      {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  async sendAppointmentConfirmationEmail(
    toEmail: string,
    toName: string,
    serviceLabel: string,
    preferredDate: string,
    preferredTime: string,
  ) {
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { email: this.senderEmail, name: this.senderName },
        to: [{ email: toEmail, name: toName }],
        subject: 'We Received Your Appointment Request',
        htmlContent: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #0B1220;">Thank You, ${toName}</h2>
          <p style="color: #4B5563;">We've received your appointment request at Kampala EEG Labs &amp; Sleep Center. Our team will reach out shortly to confirm the details.</p>
          <div style="background: #F0FDFA; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; color: #0B1220;"><strong>Service:</strong> ${serviceLabel}</p>
            <p style="margin: 0 0 8px 0; color: #0B1220;"><strong>Preferred Date:</strong> ${preferredDate}</p>
            <p style="margin: 0; color: #0B1220;"><strong>Preferred Time:</strong> ${preferredTime}</p>
          </div>
          <p style="color: #4B5563;">If you have any urgent questions in the meantime, feel free to call us at <strong>+256 751 943 706</strong> or reach out on WhatsApp.</p>
          <p style="color: #9CA3AF; font-size: 13px; margin-top: 24px;">Kampala EEG Labs &amp; Sleep Center — Upper Mulago Hill, Kampala</p>
        </div>
      `,
      },
      {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
