import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

async function testEmail() {
  console.log('Testing SMTP connection...');
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    family: 4
  } as any);

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"HRMS Portal" <no-reply@hrms.com>',
      to: 'sandeepkumar.pikili@vrpigroup.co.in',
      subject: 'Test Email from HRMS Local',
      text: 'This is a test email.',
    });
    console.log('Email sent successfully!', info.response);
  } catch (err) {
    console.error('Error sending email:', err);
  }
}

testEmail();
