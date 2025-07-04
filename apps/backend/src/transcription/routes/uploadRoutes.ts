// const express = require("express");

// const multer = require("multer");
// const xlsx = require("xlsx");
// const nodemailer = require("nodemailer");
// const Poll = require('/poll-automation-development/apps/backend/src/web/models/pollSchema');
// const router = express.Router();
// const upload = multer({ storage: multer.memoryStorage() });

// // Updated transporter configuration
// const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 587,
//   secure: false, // true for 465, false for other ports
//   auth: {
//     user: "luckymaurya9719@gmail.com",
//     pass: "vzbp gajb acbo lglq",
//   },
//   tls: {
//     rejectUnauthorized: false // Important for local testing
//   }
// });

// router.post("/upload", upload.single("file"), async (req, res) => {
//   try {
//     const file = req.file;
//     const roomCode = req.body.roomCode;
//     if (!file) return res.status(400).json({ error: "No file uploaded" });

//     const workbook = xlsx.read(file.buffer, { type: "buffer" });
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

//     if (!rows || rows.length === 0) {
//       return res.status(400).json({ error: "The file is empty" });
//     }

//     // Find email and name columns
//     const headers = rows[0].map(h => String(h).toLowerCase().trim());
//     const emailIndex = headers.findIndex(h => h.includes("email"));
//     const nameIndex = headers.findIndex(h => h.includes("name"));

//     if (emailIndex === -1) {
//       return res.status(400).json({ error: "No email column found" });
//     }

//     // Process students
//     const students = [];
//     for (let i = 1; i < rows.length; i++) {
//       const row = rows[i];
//       if (row && row[emailIndex]) {
//         const email = String(row[emailIndex]).trim();
//         const name = (nameIndex !== -1 && row[nameIndex]) ? 
//                      String(row[nameIndex]).trim() : "Student";
        
//         students.push({ email, name });
//       }
//     }

//     if (students.length === 0) {
//       return res.status(400).json({ error: "No valid email addresses found" });
//     }

//     // Send personalized emails
//     for (const student of students) {
//       await transporter.sendMail({
//         from: '"Poll System" <luckymaurya9719@gmail.com>',
//         to: student.email,
//         subject: "Poll Session Invitation",
//         text: `Hi ${student.name},\n\nYou've been invited to join our poll session!\n\nRoom Code: ${roomCode}\n\nJoin now to participate!`,
//         html: `
//           <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//             <h2 style="color: #2563eb;">Poll Session Invitation</h2>
//             <p>Hi ${student.name},</p>
//             <p>You've been invited to join our poll session!</p>
//             <p><strong>Room Code:</strong> ${roomCode}</p>
//             <p>Join now to participate!</p>
//             <br/>
//             <p>Best regards,<br/>The Poll Team</p>
//           </div>
//         `
//       });
//       console.log(`✅ Email sent to ${student.email}`);
//     }

//     res.json({ 
//       message: `Emails sent successfully to ${students.length} students`,
//       count: students.length
//     });
//   } catch (err) {
//     console.error("❌ Error sending invites:", err);
//     res.status(500).json({ 
//       error: "Failed to send emails",
//       details: err.message 
//     });
//   }
// });

// router.post('/api/polls', async (req, res) => {
//   try {
//     const poll = await Poll.create(req.body);
//     const lastQuestion = poll.questions[poll.questions.length - 1];

//     if (lastQuestion && lastQuestion.is_active && lastQuestion.is_approved) {

//       io.emit('poll-question', [lastQuestion]);
//       console.log(`Emitted question: "${lastQuestion.question}"`);

//       await Poll.updateOne(
//         { _id: poll._iad, 'questions._id': lastQuestion._id },
//         { $set: { 'questions.$.is_active': false } }
//       );

//       console.log(`Marked question as inactive`);
//     }

//     res.status(201).json(poll);
//   } catch (err) {
//     console.error('Poll creation failed:', err);
//     res.status(500).json({ error: 'Failed to create poll' });
//   }
// });

// module.exports = router;




import express, { Router } from 'express';
import multer from 'multer';
import  {handleUpload}  from '../../web/controllers/uploadController';

const router: Router = express.Router();


const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), handleUpload);

export default router;
