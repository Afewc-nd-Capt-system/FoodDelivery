const express = require('express')
const router = express.Router()
const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, type, businessName, message, city, state } = req.body

    const typeLabels = {
      restaurant: 'Restaurant Partner',
      vendor: 'Home Cook / Vendor',
      delivery: 'Delivery Company',
      rider: 'Individual Rider',
    }

    await transporter.sendMail({
      from: `"VibeChops Platform" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `New Partner Application: ${typeLabels[type] || type} - ${businessName}`,
      html: `
        <h2>New Partner Application</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;border:1px solid #ddd"><b>Type</b></td>
              <td style="padding:8px;border:1px solid #ddd">${typeLabels[type]}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd"><b>Business</b></td>
              <td style="padding:8px;border:1px solid #ddd">${businessName}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd"><b>Name</b></td>
              <td style="padding:8px;border:1px solid #ddd">${name}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd"><b>Email</b></td>
              <td style="padding:8px;border:1px solid #ddd">${email}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd"><b>Phone</b></td>
              <td style="padding:8px;border:1px solid #ddd">${phone}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd"><b>Location</b></td>
              <td style="padding:8px;border:1px solid #ddd">${city}, ${state}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd"><b>Message</b></td>
              <td style="padding:8px;border:1px solid #ddd">${message || 'N/A'}</td></tr>
        </table>
        <p style="margin-top:20px">
          <a href="${process.env.FRONTEND_URL}/admin/login"
             style="background:#E8621A;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold">
            Review in Admin Dashboard
          </a>
        </p>
      `
    })

    await transporter.sendMail({
      from: `"VibeChops" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'We received your VibeChops partner application!',
      html: `
        <h2>Application Received! 🎉</h2>
        <p>Hi ${name},</p>
        <p>Thank you for applying to be a <b>${typeLabels[type]}</b> partner with VibeChops.</p>
        <p>We've received your application for <b>${businessName}</b> in ${city}, ${state}.</p>
        <p>Our team will review your application and reach out within <b>24-48 hours</b> with next steps including your registration link.</p>
        <p>If you have any questions, reply to this email.</p>
        <p>Best regards,<br>The VibeChops Team</p>
      `
    })

    res.json({ success: true, message: 'Application received. Check your email!' })
  } catch (err) {
    console.error('Contact form error:', err)
    res.json({ success: true })
  }
})

module.exports = router
