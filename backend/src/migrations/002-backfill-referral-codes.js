/**
 * Backfill `referralCode` for users created before the referral system existed.
 * The value must be unique (the schema declares a unique sparse index).
 */
module.exports.up = async (db) => {
  const users = db.collection('users');
  const cursor = users.find(
    { $or: [{ referralCode: { $exists: false } }, { referralCode: null }, { referralCode: '' }] },
    { projection: { _id: 1 } }
  );

  let updated = 0;
  while (await cursor.hasNext()) {
    const user = await cursor.next();
    let code;
    do {
      code = 'VIBE' + Math.random().toString(36).substring(2, 10).toUpperCase();
    } while (await users.findOne({ referralCode: code }, { projection: { _id: 1 } }));

    await users.updateOne({ _id: user._id }, { $set: { referralCode: code } });
    updated += 1;
  }

  return { updated };
};
