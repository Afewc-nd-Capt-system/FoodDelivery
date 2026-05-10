import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, Alert } from 'react-native';
import { router } from 'expo-router';
import { Share as ShareIcon, Gift, Copy } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ReferralScreen() {
  const [referralCode, setReferralCode] = useState('VIBE2024');
  const [referralEarnings, setReferralEarnings] = useState(5000);
  const [referralsCount, setReferralsCount] = useState(12);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Use my referral code ${referralCode} to get ₦500 off your first order on VibeChops! Download the app now.`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCopyCode = () => {
    Alert.alert('Copied', `Referral code ${referralCode} copied to clipboard`);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer & Earn</Text>
        <View style={{ width: 40 }} />
      </View>

      <LinearGradient colors={['#E8621A', '#C4501A']} style={styles.earningsCard}>
        <Gift size={48} color="#FFFFFF" />
        <Text style={styles.earningsAmount}>₦{referralEarnings.toLocaleString()}</Text>
        <Text style={styles.earningsLabel}>Total Earnings</Text>
      </LinearGradient>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{referralsCount}</Text>
          <Text style={styles.statLabel}>Successful Referrals</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>₦500</Text>
          <Text style={styles.statLabel}>Per Referral</Text>
        </View>
      </View>

      <View style={styles.codeSection}>
        <Text style={styles.sectionTitle}>Your Referral Code</Text>
        <TouchableOpacity style={styles.codeCard} onPress={handleCopyCode}>
          <Text style={styles.codeText}>{referralCode}</Text>
          <Copy size={20} color="#E8621A" />
        </TouchableOpacity>
      </View>

      <View style={styles.shareSection}>
        <Text style={styles.sectionTitle}>Share with Friends</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <ShareIcon size={20} color="#FFFFFF" />
          <Text style={styles.shareButtonText}>Share Link</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.howSection}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        <View style={styles.stepCard}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Share your code</Text>
            <Text style={styles.stepDescription}>Send your referral code to friends</Text>
          </View>
        </View>
        <View style={styles.stepCard}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Friend signs up</Text>
            <Text style={styles.stepDescription">They use your code to register</Text>
          </View>
        </View>
        <View style={styles.stepCard}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>You earn ₦500</Text>
            <Text style={styles.stepDescription">Get credited when they place first order</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
  },
  backText: {
    fontSize: 16,
    color: '#E8621A',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1C1E',
  },
  earningsCard: {
    margin: 24,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#E8621A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  earningsAmount: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 12,
  },
  earningsLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#E8621A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#636366',
    textAlign: 'center',
  },
  codeSection: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  codeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E8621A',
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#E8621A',
    letterSpacing: 4,
  },
  shareSection: {
    padding: 24,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#E8621A',
    padding: 16,
    borderRadius: 12,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  howSection: {
    padding: 24,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8621A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#636366',
  },
});
