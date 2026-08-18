const { Resend } = require('resend');

const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  if (!process.env.RESEND_FROM) {
    throw new Error('RESEND_FROM is not configured');
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM,
    to,
    subject,
    html,
    text,
  });

  if (error) {
    throw new Error(error.message || 'Failed to send email');
  }

  console.log(`Email sent successfully to ${to}`, data?.id || '');

  return data;
};

module.exports = sendEmail;