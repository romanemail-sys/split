import nodemailer from 'nodemailer';
import { config } from '../config';

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
});

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const url = `${config.CLIENT_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: config.EMAIL_FROM,
    to,
    subject: 'אמת את כתובת האימייל שלך',
    html: `<p>לחץ <a href="${url}">כאן</a> לאימות חשבונך.</p><p>הקישור תקף ל-24 שעות.</p>`,
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const url = `${config.CLIENT_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: config.EMAIL_FROM,
    to,
    subject: 'איפוס סיסמה',
    html: `<p>לחץ <a href="${url}">כאן</a> לאיפוס סיסמתך.</p><p>הקישור תקף ל-1 שעה.</p>`,
  });
}
