/**
 * Backfill `deletedAt: null` on soft-deletable collections.
 * Queries that filter `deletedAt: null` do not match documents where the field
 * is missing, so older records could disappear from listings.
 */
const COLLECTIONS = ['users', 'orders', 'restaurants', 'vendors'];

module.exports.up = async (db) => {
  const result = {};

  for (const name of COLLECTIONS) {
    const update = await db
      .collection(name)
      .updateMany({ deletedAt: { $exists: false } }, { $set: { deletedAt: null } });
    result[name] = update.modifiedCount;
  }

  return result;
};
