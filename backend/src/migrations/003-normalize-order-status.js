/**
 * Normalize legacy order status spelling.
 * Older order/rider code wrote `out_for_delivery` (underscore) while the
 * customer app and email templates expect `out-for-delivery` (hyphen).
 */
module.exports.up = async (db) => {
  const update = await db
    .collection('orders')
    .updateMany({ status: 'out_for_delivery' }, { $set: { status: 'out-for-delivery' } });

  return { modified: update.modifiedCount };
};
