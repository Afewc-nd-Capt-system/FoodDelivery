const express = require('express')
const router = express.Router()
const PartnerApplication = require('../../models/PartnerApplication')
const { sendEmail } = require('../../utils/email')
const templates = require('../../services/emailTemplates')

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

    // Emails are fire-and-forget: never fail the request because a provider is down.
    const ownerEmail = process.env.EMAIL_OWNER || process.env.EMAIL_USER
    if (ownerEmail) {
      const adminTemplate = templates.partnerApplicationAdmin({
        name: application.name,
        typeLabel: typeLabels[type],
        businessName: application.businessName,
        email: application.email,
        phone: application.phone,
        city: application.city,
        state: application.state,
        message: application.message,
        applicationId: application._id,
      })
      sendEmail({ to: ownerEmail, ...adminTemplate, type: 'partner-application-admin' })
        .catch((err) => console.error('Contact notification email failed:', err.message))
    }

    const receivedTemplate = templates.partnerApplicationReceived({
      name: application.name,
      typeLabel: typeLabels[type],
      businessName: application.businessName,
      city: application.city,
      state: application.state,
    })
    sendEmail({ to: application.email, ...receivedTemplate, type: 'partner-application-received' })
      .catch((err) => console.error('Contact acknowledgement email failed:', err.message))

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
