import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

async function testEmail() {
  console.log('Testing SMTP connection on port 465...');
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: 465,
    secure: true,
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
      subject: 'Test Email from HRMS Local Port 465',
      text: 'This is a test email on port 465.',
    });
    console.log('Email sent successfully!', info.response);
  } catch (err) {
    console.error('Error sending email:', err);
  }
}

testEmail();
