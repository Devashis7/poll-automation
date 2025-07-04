import { Request, Response } from 'express';
import xlsx from 'xlsx';
import nodemailer from 'nodemailer';
import { ParsedQs } from 'qs';

export interface UploadRequest extends Request {
  file?: Express.Multer.File; // ✅ make optional to fix the type error
  body: {
    roomCode: string;
  } & ParsedQs;
}

// ✅ Configure your transporter (update credentials for security in real use)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'luckymaurya9719@gmail.com',
    pass: 'vzbp gajb acbo lglq',
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export const handleUpload = async (req: UploadRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const roomCode = req.body.roomCode;
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    if (!rows || rows.length === 0) {
      res.status(400).json({ error: 'The file is empty' });
      return;
    }

    const headers = rows[0].map((h) => String(h).toLowerCase().trim());
    const emailIndex = headers.findIndex((h) => h.includes('email'));
    const nameIndex = headers.findIndex((h) => h.includes('name'));

    if (emailIndex === -1) {
      res.status(400).json({ error: 'No email column found' });
      return;
    }

    const students: { email: string; name: string }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row && row[emailIndex]) {
        const email = String(row[emailIndex]).trim();
        const name =
          nameIndex !== -1 && row[nameIndex] ? String(row[nameIndex]).trim() : 'Student';
        students.push({ email, name });
      }
    }

    if (students.length === 0) {
      res.status(400).json({ error: 'No valid email addresses found' });
      return;
    }

    for (const student of students) {
      await transporter.sendMail({
        from: '"Poll System" <luckymaurya9719@gmail.com>',
        to: student.email,
        subject: 'Poll Session Invitation',
        text: `Hi ${student.name},\n\nYou've been invited to join our poll session!\n\nRoom Code: ${roomCode}\n\nJoin now to participate!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Poll Session Invitation</h2>
            <p>Hi ${student.name},</p>
            <p>You've been invited to join our poll session!</p>
            <p><strong>Room Code:</strong> ${roomCode}</p>
            <p>Join now to participate!</p>
            <br/>
            <p>Best regards,<br/>The Poll Team</p>
          </div>
        `,
      });

      console.log(`✅ Email sent to ${student.email}`);
    }

    res.json({
      message: `Emails sent successfully to ${students.length} students`,
      count: students.length,
    });
  } catch (err: any) {
    console.error('❌ Error sending invites:', err);
    res.status(500).json({
      error: 'Failed to send emails',
      details: err.message,
    });
  }
};
