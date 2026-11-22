'use strict';

// Email verification safety migration:
// partner/rider/delivery-company/admin accounts were created through an
// invitation or an admin action, which proves the address. Existing customers
// stay unverified so they are prompted to confirm their own email.
const NON_CUSTOMER_ROLES = ['admin', 'restaurant', 'vendor', 'delivery_company', 'delivery_rider', 'delivery'];

async function up(db) {
  const result = await db.collection('users').updateMany(
    { role: { $in: NON_CUSTOMER_ROLES }, emailVerified: { $ne: true } },
    { $set: { emailVerified: true } }
  );
  const matched = result.matchedCount ?? result.n ?? 0;
  const modified = result.modifiedCount ?? result.nModified ?? 0;
  return { matched, modified, roles: NON_CUSTOMER_ROLES };
}

module.exports = { up, NON_CUSTOMER_ROLES };
