import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  if (!env.EMAIL_USER || !env.EMAIL_APP_PASSWORD ||
      env.EMAIL_USER === 'your_email@gmail.com') {
    throw Object.assign(new Error('Email delivery is not configured. Please contact support.'), {statusCode:503,code:'EMAIL_UNAVAILABLE'});
  }

  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_APP_PASSWORD,
    },
  });

  return _transporter;
}

/**
 * Send a password-reset OTP to the user's email address.
 * @param {string} to       – recipient email
 * @param {string} otp      – 6-digit code
 * @param {string} name     – user's name for personalisation
 */
export async function sendPasswordResetOtpEmail(to, otp, name = 'there') {
  const subject = 'Your Gather & Grow password reset code';
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px;background:#fff">
      <h2 style="margin:0 0 8px;font-size:22px;color:#111">Reset your password</h2>
      <p style="color:#555;margin:0 0 24px">Hi ${escapeHtml(name)}, use the code below to reset your Gather &amp; Grow account password. It expires in <strong>10 minutes</strong>.</p>
      <div style="text-align:center;padding:20px;background:#f5f5f5;border-radius:8px;letter-spacing:8px;font-size:36px;font-weight:700;color:#111;font-family:monospace">
        ${otp}
      </div>
      <p style="color:#888;font-size:13px;margin:24px 0 0">If you didn't request this, you can safely ignore this email. Do not share this code with anyone.</p>
    </div>
  `;

  const transporter = getTransporter();

  await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html });
}

/**
 * Send a login verification OTP to the user's email address.
 * @param {string} to       – recipient email
 * @param {string} otp      – 6-digit code
 * @param {string} name     – user's name
 */
export async function sendLoginOtpEmail(to, otp, name = 'there') {
  const subject = 'Your Gather & Grow login verification code';
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px;background:#fff">
      <h2 style="margin:0 0 8px;font-size:22px;color:#111">Sign in verification</h2>
      <p style="color:#555;margin:0 0 24px">Hi ${escapeHtml(name)}, use the code below to complete your sign in. It expires in <strong>10 minutes</strong>.</p>
      <div style="text-align:center;padding:20px;background:#f5f5f5;border-radius:8px;letter-spacing:8px;font-size:36px;font-weight:700;color:#111;font-family:monospace">
        ${otp}
      </div>
      <p style="color:#888;font-size:13px;margin:24px 0 0">If you did not attempt to sign in, please update your account password immediately.</p>
    </div>
  `;

  const transporter = getTransporter();

  await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html });
}

/**
 * Forward a contact-form submission to the site admin email.
 * @param {{ name: string, email: string, subject: string, message: string }} data
 */
export async function sendContactFormEmail(data) {
  const subject = `[Contact] ${data.subject || 'New enquiry from ' + data.name}`;
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px 24px">
      <h2 style="margin:0 0 16px">New contact enquiry</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 0;color:#555;width:100px"><strong>Name</strong></td><td>${escapeHtml(data.name)}</td></tr>
        <tr><td style="padding:8px 0;color:#555"><strong>Email</strong></td><td>${escapeHtml(data.email)}</td></tr>
        <tr><td style="padding:8px 0;color:#555"><strong>Phone</strong></td><td>${escapeHtml(data.phone || '—')}</td></tr>
        <tr><td style="padding:8px 0;color:#555"><strong>Subject</strong></td><td>${escapeHtml(data.subject)}</td></tr>
      </table>
      <hr style="margin:16px 0;border:none;border-top:1px solid #eee">
      <p style="white-space:pre-wrap;color:#333">${escapeHtml(data.message)}</p>
    </div>
  `;

  const transporter = getTransporter();

  // Send to the admin inbox (same as EMAIL_USER by default)
  await transporter.sendMail({ from: env.EMAIL_FROM, to: env.EMAIL_USER, replyTo: data.email, subject, html });
  await transporter.sendMail({from:env.EMAIL_FROM,to:data.email,subject:'We received your message — Gather & Grow',text:`Hello ${data.name},\n\nThank you for contacting Gather & Grow. Our team has received your message and will reply as soon as possible.\n\nSubject: ${data.subject}\n\nGather & Grow support`});
  return {autoReplySent:true};
}
export async function sendRegistrationOtpEmail(to,code,name){
 const transporter=getTransporter();
 await transporter.sendMail({from:env.EMAIL_FROM,to,subject:'Verify your Gather & Grow account',text:`Hello ${name},\n\nYour email verification code is ${code}. It expires in 10 minutes.\n\nIf you did not request an account, ignore this email.`});
}
