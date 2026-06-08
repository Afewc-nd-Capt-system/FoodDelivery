'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUp, ArrowDown, Filter, Search } from 'lucide-react';
import { mockWalletTransactions } from '@/lib/mockData';

export default function WalletPage() {
  const [balance, setBalance] = useState(7500);
  const [selectedAmount, setSelectedAmount] = useState('1000');
  const [customAmount, setCustomAmount] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const allTransactions = [
    { id: '1', type: 'credit', description: 'Wallet top-up', amount: 5000, date: 'May 5, 2026', balance: 7500 },
    { id: '2', type: 'debit', description: 'Order #ORD-8021', amount: 3200, date: 'May 3, 2026', balance: 2500 },
    { id: '3', type: 'credit', description: 'Referral Bonus', amount: 1000, date: 'May 1, 2026', balance: 5700 },
    ...mockWalletTransactions,
  ];

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const API_URL = 'https://vibechops.onrender.com/api';
      const response = await fetch(`${API_URL}/v2/wallet/transactions`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      } else {
        setTransactions(allTransactions);
      }
    } catch (error) {
      setTransactions(allTransactions);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = (transactions.length > 0 ? transactions : allTransactions).filter(txn => {
    const matchesType = filterType === 'all' || txn.type === filterType;
    const matchesSearch = txn.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          txn.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-black text-[#1C1C1E] mb-8">VibeChops Wallet</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Balance Card */}
        <div className="md:col-span-2 bg-gradient-to-r from-[#E8621A] to-[#BE3A2A] rounded-3xl p-8 text-white">
          <p className="text-white/80 text-sm mb-2">Available Balance</p>
          <h2 className="text-4xl font-black mb-4">₦{balance.toLocaleString()}</h2>
          <p className="text-white/60 text-xs">VibeChops Wallet</p>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <Button className="w-full bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white font-black py-6 rounded-2xl">
            Top Up Wallet
          </Button>
          <Button className="w-full bg-white border border-[#E8E8E8] text-[#636366] hover:bg-[#FFF1E8] py-6 rounded-2xl">
            Transaction History
          </Button>
        </div>
      </div>

      {/* Top Up Section */}
      <Card className="p-6 mb-8">
        <h3 className="font-black mb-4">Top Up Wallet</h3>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {['500', '1000', '2000', '5000'].map((amt) => (
            <button
              key={amt}
              onClick={() => { setSelectedAmount(amt); setCustomAmount(''); }}
              className={`py-3 rounded-xl text-sm font-medium transition-all ${
                selectedAmount === amt
                  ? 'border-2 border-[#E8621A] bg-[#FFF1E8] text-[#E8621A]'
                  : 'bg-[#F5F5F5] text-[#636366]'
              }`}
            >
              ₦{amt}
            </button>
          ))}
        </div>
        <div className="flex gap-3 mb-4">
          <Input
            placeholder="Custom amount"
            value={customAmount}
            onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(''); }}
            className="flex-1"
          />
          <Button className="bg-gradient-to-r from-[#E8621A] to-[#C4501A] text-white">
            Top Up
          </Button>
        </div>
        <p className="text-xs text-[#A0A0A0]">Powered by Paystack</p>
      </Card>

      {/* Transaction History */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black">Transaction History</h3>
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32 border-[#E8E8E8] rounded-xl">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="credit">Credits</SelectItem>
                <SelectItem value="debit">Debits</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-[#E8E8E8] rounded-xl"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#E8621A]"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map((txn) => {
              const isCredit = txn.type === 'credit';
              return (
                <div key={txn.id} className="flex items-center gap-4 py-3 border-b border-[#F0EAE0] last:border-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCredit ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#FFF1E8] text-[#E8621A]'
                  }`}>
                    {isCredit ? <ArrowDown className="w-5 h-5" /> : <ArrowUp className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#1C1C1E]">{txn.description}</p>
                    <p className="text-xs text-[#A0A0A0]">{txn.date}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${isCredit ? 'text-[#16A34A]' : 'text-[#E8621A]'}`}>
                      {isCredit ? '+' : '-'}₦{txn.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-[#A0A0A0]">Bal: ₦{txn.balance?.toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
            {filteredTransactions.length === 0 && (
              <div className="text-center py-8 text-[#636366]">No transactions found</div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
