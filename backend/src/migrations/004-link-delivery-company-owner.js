/**
 * Link legacy delivery companies to their delivery_company user account.
 *
 * Company authorization uses `DeliveryCompany.owner`, which did not exist on
 * older records. Match the company email to a user with the delivery_company
 * role; fall back to the seeded delivery@vibechops.ng account for the seeded
 * company. Only companies without an owner are touched, so this is idempotent.
 */
const COMPANIES = 'deliverycompanies';
const USERS = 'users';
const SEEDED_COMPANY_EMAIL = 'delivery@vibechops.ng';
const SEEDED_COMPANY_NAME = 'Swift Delivery Co';

module.exports.up = async (db) => {
  const companies = await db
    .collection(COMPANIES)
    .find({
      $or: [{ owner: { $exists: false } }, { owner: null }],
    })
    .toArray();

  let linked = 0;
  const unmatched = [];

  for (const company of companies) {
    const email = String(company.email || '').trim().toLowerCase();
    let user = null;

    if (email) {
      user = await db.collection(USERS).findOne({
        email,
        role: 'delivery_company',
      });
    }

    if (!user && (email === SEEDED_COMPANY_EMAIL || company.companyName === SEEDED_COMPANY_NAME)) {
      user = await db.collection(USERS).findOne({
        email: SEEDED_COMPANY_EMAIL,
        role: 'delivery_company',
      });
    }

    if (!user) {
      unmatched.push({
        id: company._id,
        email: company.email,
        companyName: company.companyName,
      });
      continue;
    }

    await db.collection(COMPANIES).updateOne(
      {
        _id: company._id,
        $or: [{ owner: { $exists: false } }, { owner: null }],
      },
      { $set: { owner: user._id, updatedAt: new Date() } }
    );
    linked += 1;
  }

  return {
    linked,
    unmatched: unmatched.length,
    unmatchedCompanies: unmatched,
  };
};
