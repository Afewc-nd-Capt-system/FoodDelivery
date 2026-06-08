'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Upload, FileText, CheckCircle, XCircle, Clock, Shield, AlertTriangle } from 'lucide-react';

export default function DriverVerificationPage() {
  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchVerificationStatus();
    fetchDocuments();
  }, []);

  const fetchVerificationStatus = async () => {
    try {
      const API_URL = 'https://vibechops.onrender.com/api';
      const response = await fetch(`${API_URL}/delivery/verification/status`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setVerificationStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch verification status:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const API_URL = 'https://vibechops.onrender.com/api';
      const response = await fetch(`${API_URL}/delivery/verification/documents`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const handleFileUpload = async (documentType: string, file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);

      const API_URL = 'https://vibechops.onrender.com/api';
      const response = await fetch(`${API_URL}/delivery/verification/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (response.ok) {
        fetchDocuments();
        fetchVerificationStatus();
      }
    } catch (error) {
      console.error('Failed to upload document:', error);
    } finally {
      setUploading(false);
    }
  };

  const documentTypes = [
    { id: 'drivers_license', name: "Driver's License", required: true, icon: FileText },
    { id: 'vehicle_registration', name: 'Vehicle Registration', required: true, icon: FileText },
    { id: 'insurance', name: 'Insurance Proof', required: true, icon: Shield },
    { id: 'bvn', name: 'BVN', required: false, icon: FileText },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-[#F0FDF4] text-[#16A34A]"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      case 'pending':
        return <Badge className="bg-[#FFF1E8] text-[#E8621A]"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-[#FEE2E2] text-[#D32F2F]"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-[#F5F5F5] text-[#636366]">Not Submitted</Badge>;
    }
  };

  return (
    <div style={{ backgroundColor: '#FFF8F0', minHeight: '100vh' }}>
      <div style={{ background: 'linear-gradient(135deg, #1C1C1E 0%, #2C1810 100%)' }} className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/delivery/profile">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-2xl font-black text-white">Driver Verification</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Verification Status */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#FFF1E8] flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#E8621A]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#1C1C1E]">Verification Status</h2>
              {verificationStatus?.status && getStatusBadge(verificationStatus.status)}
            </div>
          </div>

          {verificationStatus?.status === 'pending' && (
            <Alert className="bg-[#FFF1E8] border-[#E8621A]">
              <AlertTriangle className="h-4 w-4 text-[#E8621A]" />
              <AlertDescription className="text-[#1C1C1E]">
                Your documents are under review. This typically takes 1-3 business days.
              </AlertDescription>
            </Alert>
          )}

          {verificationStatus?.status === 'rejected' && verificationStatus?.rejectionReason && (
            <Alert className="bg-[#FEE2E2] border-[#D32F2F] mt-4">
              <XCircle className="h-4 w-4 text-[#D32F2F]" />
              <AlertDescription className="text-[#1C1C1E]">
                <strong>Rejection Reason:</strong> {verificationStatus.rejectionReason}
              </AlertDescription>
            </Alert>
          )}

          {verificationStatus?.status === 'verified' && (
            <Alert className="bg-[#F0FDF4] border-[#16A34A]">
              <CheckCircle className="h-4 w-4 text-[#16A34A]" />
              <AlertDescription className="text-[#1C1C1E]">
                Your account has been verified! You can now start accepting orders.
              </AlertDescription>
            </Alert>
          )}
        </Card>

        {/* Document Upload */}
        <Card className="p-6">
          <h3 className="text-xl font-black text-[#1C1C1E] mb-6">Required Documents</h3>
          <div className="space-y-4">
            {documentTypes.map((docType) => {
              const Icon = docType.icon;
              const existingDoc = documents.find(d => d.documentType === docType.id);
              
              return (
                <Card key={docType.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#F5F5F5] flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#636366]" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">{docType.name}</h4>
                        <p className="text-xs text-[#636366]">
                          {docType.required && <span className="text-[#D32F2F]">Required</span>}
                          {!docType.required && <span>Optional</span>}
                        </p>
                      </div>
                    </div>
                    {existingDoc && getStatusBadge(existingDoc.status)}
                  </div>

                  {existingDoc ? (
                    <div className="text-sm text-[#636366]">
                      <p>Uploaded: {new Date(existingDoc.uploadedAt).toLocaleDateString()}</p>
                      {existingDoc.status === 'rejected' && existingDoc.rejectionReason && (
                        <p className="text-[#D32F2F] mt-1">{existingDoc.rejectionReason}</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(docType.id, file);
                        }}
                        disabled={uploading}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        disabled={uploading}
                        className="bg-[#E8621A] text-white"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-[#F5F5F5] rounded-xl">
            <h4 className="font-bold text-sm mb-2">Document Requirements:</h4>
            <ul className="text-xs text-[#636366] space-y-1">
              <li>• Documents must be clear and readable</li>
              <li>• Accepted formats: JPG, PNG, PDF</li>
              <li>• Maximum file size: 5MB</li>
              <li>• Documents must be valid and not expired</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
