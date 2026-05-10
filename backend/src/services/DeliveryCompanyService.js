const DeliveryCompany = require('../models/DeliveryCompany');
const DeliveryPartner = require('../models/DeliveryPartner');

class DeliveryCompanyService {
  static async registerCompany(companyData) {
    const company = new DeliveryCompany(companyData);
    await company.save();
    return company;
  }

  static async addRiderToCompany(companyId, riderData) {
    const company = await DeliveryCompany.findById(companyId);
    if (!company) throw new Error('Company not found');

    const rider = new DeliveryPartner({
      ...riderData,
      company: companyId,
      companyId: this.generateCompanyId(companyId)
    });

    await rider.save();
    
    company.fleet.totalRiders += 1;
    await company.save();

    return rider;
  }

  static generateCompanyId(companyId) {
    return 'DP-' + Date.now().toString(36).toUpperCase();
  }

  static async getCompanyRiders(companyId) {
    return DeliveryPartner.find({ company: companyId, isActive: true })
      .select('-password')
      .sort({ createdAt: -1 });
  }

  static async getCompanyStats(companyId) {
    const company = await DeliveryCompany.findById(companyId);
    const riders = await DeliveryPartner.find({ company: companyId });
    
    const activeRiders = riders.filter(r => r.isOnline).length;
    const totalDeliveries = riders.reduce((sum, r) => sum + r.totalDeliveries, 0);
    const totalEarnings = riders.reduce((sum, r) => sum + r.earnings, 0);

    return {
      totalRiders: riders.length,
      activeRiders,
      totalDeliveries,
      totalEarnings,
      rating: company.rating,
      fleet: company.fleet,
      wallet: company.wallet
    };
  }
}

module.exports = DeliveryCompanyService;
