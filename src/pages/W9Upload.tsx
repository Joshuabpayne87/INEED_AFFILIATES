import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Upload, CheckCircle, XCircle, AlertCircle, FileText, Download, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface TaxDocStatus {
  id?: string;
  status: 'none' | 'submitted' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  submitted_at?: string;
  reviewed_at?: string;
}

export function W9Upload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [docStatus, setDocStatus] = useState<TaxDocStatus>({ status: 'none' });
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadTaxDocStatus();
    }
  }, [user]);

  const loadTaxDocStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('affiliate_tax_docs')
        .select('id, status, rejection_reason, submitted_at, reviewed_at')
        .eq('affiliate_user_id', user.id)
        .eq('doc_type', 'w9')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading tax doc status:', error);
      }

      if (data) {
        setDocStatus({
          id: data.id,
          status: data.status as 'submitted' | 'approved' | 'rejected',
          rejection_reason: data.rejection_reason,
          submitted_at: data.submitted_at,
          reviewed_at: data.reviewed_at,
        });
      } else {
        setDocStatus({ status: 'none' });
      }
    } catch (error) {
      console.error('Error loading tax doc status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(selectedFile.type)) {
      alert('Please upload a PDF, JPEG, or PNG file');
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      alert('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploading(true);
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `w9-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('tax-docs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Create or update tax doc record
      const { error: docError } = await supabase
        .from('affiliate_tax_docs')
        .upsert({
          affiliate_user_id: user.id,
          doc_type: 'w9',
          file_path: filePath,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        }, {
          onConflict: 'affiliate_user_id,doc_type',
        });

      if (docError) {
        throw docError;
      }

      // Reload status
      await loadTaxDocStatus();
      setFile(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading W-9:', error);
      alert(error.message || 'Failed to upload W-9. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = () => {
    switch (docStatus.status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4 mr-1" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
            <XCircle className="w-4 h-4 mr-1" />
            Rejected
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
            <Upload className="w-4 h-4 mr-1" />
            Under Review
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">W-9 Tax Form</h1>
        </div>
        <Card className="h-96 animate-pulse bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">W-9 Tax Form</h1>
        <p className="text-gray-600">Upload your W-9 form to receive commission payouts</p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          {/* Status Banner */}
          {docStatus.status !== 'none' && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <span className="font-semibold text-gray-900">Current Status</span>
                </div>
                {getStatusBadge()}
              </div>
              {docStatus.status === 'submitted' && docStatus.submitted_at && (
                <p className="text-sm text-gray-600">
                  Submitted on {new Date(docStatus.submitted_at).toLocaleDateString()}
                </p>
              )}
              {docStatus.status === 'rejected' && docStatus.rejection_reason && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm font-semibold text-red-900 mb-1">Rejection Reason:</p>
                  <p className="text-sm text-red-800">{docStatus.rejection_reason}</p>
                  <p className="text-xs text-red-700 mt-2">
                    Please upload a corrected W-9 form below.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Compliance Info */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">Why We Need Your W-9</h3>
                <p className="text-sm text-blue-800 mb-3">
                  Federal tax regulations require us to collect W-9 forms from all affiliates receiving payments.
                  We cannot process commission payouts without an approved W-9 form on file.
                </p>
                <a
                  href="https://www.irs.gov/pub/irs-pdf/fw9.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-900 hover:text-blue-700"
                >
                  <Download className="w-4 h-4" />
                  Download IRS W-9 Form (PDF)
                </a>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          {docStatus.status !== 'approved' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Upload W-9 Form
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="w9-upload"
                    disabled={uploading || docStatus.status === 'submitted'}
                  />
                  <label
                    htmlFor="w9-upload"
                    className={`cursor-pointer flex flex-col items-center ${uploading || docStatus.status === 'submitted' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {preview ? (
                      <img
                        src={preview}
                        alt="Preview"
                        className="max-w-md max-h-96 rounded-lg border-2 border-gray-200 mb-4"
                      />
                    ) : (
                      <>
                        <Upload className="w-12 h-12 text-gray-400 mb-3" />
                        <span className="text-sm font-medium text-gray-700 mb-1">
                          {file ? file.name : 'Click to upload or drag and drop'}
                        </span>
                        <span className="text-xs text-gray-500">
                          PDF, JPEG, or PNG up to 10MB
                        </span>
                      </>
                    )}
                  </label>
                </div>
                {file && !preview && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span>{file.name}</span>
                  </div>
                )}
              </div>

              <Button
                onClick={handleUpload}
                disabled={!file || uploading || docStatus.status === 'submitted'}
                variant="gradient"
                className="w-full"
                size="lg"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload W-9 Form
                  </>
                )}
              </Button>

              {docStatus.status === 'submitted' && (
                <p className="text-sm text-gray-600 text-center">
                  Your W-9 is currently under review. We'll notify you once it's been processed.
                </p>
              )}
            </div>
          )}

          {/* Approved Message */}
          {docStatus.status === 'approved' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                W-9 Form Approved
              </h3>
              <p className="text-sm text-green-800 mb-4">
                Your W-9 form has been approved. You're all set to receive commission payouts!
              </p>
              {docStatus.reviewed_at && (
                <p className="text-xs text-green-700">
                  Approved on {new Date(docStatus.reviewed_at).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}


