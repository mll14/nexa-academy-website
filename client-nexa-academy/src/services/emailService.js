// src/services/emailService.js
// DEPRECATED: Email sending is now handled by the Django backend.
// This file is kept for reference only. Do not import from this file.
// All email triggers (application confirmations, newsletter welcome,
// contact form notifications, status updates) are now sent server-side
// via Django's SMTP email backend (smtp.gmail.com).

export const sendApplicationEmails = async () => {
  return { success: true, message: 'Handled by backend' };
};

export const sendProgramInquiry = async () => {
  return { success: true, message: 'Handled by backend' };
};

export const sendNewsletterConfirmation = async () => {
  return { success: true, message: 'Handled by backend' };
};

export const testEmailJSService = async () => {
  return { success: false, message: 'EmailJS has been replaced by Django SMTP backend.' };
};
