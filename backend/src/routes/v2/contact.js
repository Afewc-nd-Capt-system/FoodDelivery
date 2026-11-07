const express = require('express')
const router = express.Router()
const PartnerApplication = require('../../models/PartnerApplication')
const { sendEmail } = require('../../utils/email')
const { frontendUrl } = require('../../config/frontend')

const typeLabels = {
  restaurant: 'Restaurant Partner',
  vendor: 'Home Cook / Vendor',
  delivery: 'Delivery Company',
  rider: 'Individual Rider',
}

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, type, businessName, message, city, state } = req.body

    if (!name || !email || !phone || !businessName) {
      return res.status(400).json({ success: false, message: 'Name, email, phone and business name are required.' })
    }
    if (!Object.prototype.hasOwnProperty.call(typeLabels, type)) {
      return res.status(400).json({ success: false, message: 'Choose a valid partner type.' })
    }

    // Persist the application so admins can review and approve it. Approvals
    // generate the single-use invitation that unlocks registration.
    const application = await PartnerApplication.create({
      type,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone).trim(),
      businessName: String(businessName).trim(),
      city,
      state,
      message,
    })

    // Emails are fire-and-forget: never fail the request because SMTP is down.
    sendEmail({
      to: process.env.EMAIL_USER,
      subject: `New Partner Application: ${typeLabels[type]} - ${businessName}`,
      html: `
        <h2>New Partner Application</h2>
        <p><b>Type:</b> ${typeLabels[type]}<br/>
        <b>Business:</b> ${businessName}<br/>
        <b>Name:</b> ${name}<br/>
        <b>Email:</b> ${email}<br/>
        <b>Phone:</b> ${phone}<br/>
        <b>Location:</b> ${city || ''}, ${state || ''}<br/>
        <b>Message:</b> ${message || 'N/A'}</p>
        <p>Application ID: ${application._id}</p>
        <p><a href="${frontendUrl('/admin/dashboard')}">Review in the Admin Dashboard â†’ Applications</a></p>
      `,
    }).catch((err) => console.error('Contact notification email failed:', err.message))

    sendEmail({
      to: email,
      subject: 'We received your VibeChops partner application!',
      html: `
        <h2>Application Received! ðŸŽ‰</h2>
        <p>Hi ${name},</p>
        <p>Thank you for applying to be a <b>${typeLabels[type]}</b> partner with VibeChops.</p>
        <p>We received your application for <b>${businessName}</b> in ${city || ''}, ${state || ''}.</p>
        <p>Our team reviews applications within 24-48 hours. If approved, you will receive a
        single-use registration link that expires in 7 days.</p>
        <p>Best regards,<br/>The VibeChops Team</p>
      `,
    }).catch((err) => console.error('Contact acknowledgement email failed:', err.message))

    res.json({
      success: true,
      message: 'Application received. We will email you a registration link if approved.',
      applicationId: application._id,
    })
  } catch (err) {
    console.error('Contact form error:', err)
    res.status(500).json({ success: false, message: 'Could not submit your application. Please try again.' })
  }
})

module.exports = router
