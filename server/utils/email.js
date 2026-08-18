const nodemailer = require('nodemailer');

let transporter = null;
const getTransporter = () => {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP_HOST is configured but SMTP_USER/SMTP_PASS is missing; emails will be logged instead.');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
};

/**
 * Sends an email if SMTP_* env vars are configured. Otherwise (local dev /
 * no mail server set up) it just logs the content to the console so the
 * password-reset flow is still testable end-to-end without real SMTP.
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const t = getTransporter();
  if (!t) {
    console.log('\n--- Email (SMTP not configured, logging instead) ---');
    console.log(`To: ${to}\nSubject: ${subject}\n${text || html}`);
    console.log('----------------------------------------------------\n');
    return { logged: true };
  }
  return t.sendMail({
    from: process.env.SMTP_FROM || 'TeamTask <no-reply@teamtask.app>',
    to,
    subject,
    html,
    text,
  });
};

module.exports = sendEmail;
