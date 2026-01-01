"use client";
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../lib/api'; 
import { useAuth } from '../../../context/AuthContext';
import { 
  Loader2, 
  User, 
  Phone, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  UploadCloud, 
  Save,
  Lock,
  Camera,
  AlertCircle
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  profileImage: string | null; // Added profile image
  platformTrustScore: number;
  isEmailVerified: boolean;
  verification: {
    ninStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'FAILED';
  } | null;
}

export default function ProfilePage() {
  const { user: authUser, isLoading: isAuthLoading } = useAuth(); 
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // --- 1. Profile Form State ---
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // --- 2. Password Form State (With Confirmation) ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // --- 3. KYC Form State ---
  const [nin, setNin] = useState('');
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [docFileName, setDocFileName] = useState('No document chosen');
  const [isSubmittingKYC, setIsSubmittingKYC] = useState(false);

  // --- Fetch Profile ---
  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get<UserProfile>('/users/me');
      const data = response.data;
      setProfile(data);
      
      setFirstName(data.firstName || '');
      setLastName(data.lastName || '');
      setPhone(data.phone || '');
      setProfileImage(data.profileImage || '');
    } catch (err) {
      setError('Could not load profile data.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // --- Helper: Upload File to Cloudinary ---
  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.imageUrl;
  };

  // --- Handle Profile Update ---
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setSuccessMsg('');
    setError('');

    try {
      let finalImageUrl = profileImage;

      // If a new image was selected, upload it first
      if (selectedImageFile) {
        finalImageUrl = await uploadToCloudinary(selectedImageFile);
      }

      await api.patch('/users/me', { 
        firstName, 
        lastName, 
        phone,
        profileImage: finalImageUrl
      });
      
      setSuccessMsg('Profile updated successfully!');
      await fetchProfile(); 
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // --- Handle Password Change (With Confirmation Logic) ---
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // 1. Validate Confirmation
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setIsSavingPassword(true);
    try {
      await api.post('/users/change-password', {
        currentPassword,
        newPassword
      });
      
      setSuccessMsg('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  // --- Handle KYC Submission ---
  const handleSubmitKYC = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingKYC(true);
    setSuccessMsg('');
    setError('');

    try {
      if (!selectedDocFile) {
        throw new Error("Please upload a valid ID document.");
      }
      
      const documentUrl = await uploadToCloudinary(selectedDocFile);

      await api.post('/users/verify-kyc', {
        nin,
        documentUrl
      });

      setSuccessMsg('KYC Submitted & Verified! Your Trust Score has increased.');
      setNin('');
      setSelectedDocFile(null);
      setDocFileName('No document chosen');
      await fetchProfile(); 

    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'KYC submission failed.');
    } finally {
      setIsSubmittingKYC(false);
    }
  };

  if (isLoading || isAuthLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const kycStatus = profile.verification?.ninStatus || 'UNVERIFIED';

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-1 text-gray-600">Manage your personal details and verification status.</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-red-700">
          <AlertCircle className="w-5 h-5 mr-3" />
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center text-green-700">
          <CheckCircle className="w-5 h-5 mr-3" />
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- LEFT COLUMN: Profile & Security --- */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 1. Personal Details Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <User className="w-5 h-5 mr-2 text-indigo-600" />
                Personal Information
              </h2>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="p-6 space-y-6">
              
              {/* Profile Image Upload */}
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <img 
                    src={selectedImageFile ? URL.createObjectURL(selectedImageFile) : profileImage || 'https://via.placeholder.com/150'} 
                    alt="Profile" 
                    className="h-24 w-24 rounded-full object-cover border-4 border-indigo-50"
                  />
                  <label 
                    htmlFor="profile-image"
                    className="absolute bottom-0 right-0 bg-indigo-600 p-1.5 rounded-full text-white cursor-pointer hover:bg-indigo-700 shadow-sm"
                  >
                    <Camera className="w-4 h-4" />
                  </label>
                  <input 
                    id="profile-image" 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      if(e.target.files?.[0]) setSelectedImageFile(e.target.files[0]);
                    }}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Profile Photo</p>
                  <p className="text-xs text-gray-500">JPG or PNG. Max 2MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input 
                    type="text" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input 
                    type="text" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <input 
                  type="email" 
                  value={profile.email}
                  disabled
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="+234..."
                  />
                </div>
              </div>

              <div className="pt-2 text-right">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70"
                >
                  {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                </button>
              </div>
            </form>
          </div>

          {/* 2. Change Password Form (With Confirm) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Lock className="w-5 h-5 mr-2 text-orange-600" />
                Security
              </h2>
            </div>
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Password</label>
                <input 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">New Password</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>
              </div>
              <div className="pt-2 text-right">
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-70"
                >
                  {isSavingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* --- RIGHT COLUMN: KYC Status --- */}
        <div className="space-y-6">
          {/* Trust Score Card */}
          <div className="bg-indigo-900 rounded-2xl shadow-lg p-6 text-white">
            <h3 className="text-indigo-200 text-sm font-medium uppercase tracking-wider">Platform Trust Score</h3>
            <div className="mt-2 flex items-baseline">
              <span className="text-4xl font-bold">{profile.platformTrustScore}</span>
              <span className="ml-2 text-indigo-300">/ 1000</span>
            </div>
            <div className="mt-4 w-full bg-indigo-800 rounded-full h-2">
              <div 
                className="bg-green-400 h-2 rounded-full transition-all duration-1000" 
                style={{ width: `${(profile.platformTrustScore / 1000) * 100}%` }}
              ></div>
            </div>
            <p className="mt-4 text-xs text-indigo-300">
              Verify your identity to boost your score.
            </p>
          </div>

          {/* KYC Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <ShieldCheck className="w-5 h-5 mr-2 text-green-600" />
                Identity Verification
              </h2>
            </div>

            <div className="p-6">
              {kycStatus === 'VERIFIED' ? (
                <div className="text-center py-6">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">You are Verified!</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Your NIN and documents have been approved.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitKYC} className="space-y-4">
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-yellow-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          Please submit your NIN to verify your identity.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">NIN Number</label>
                    <input 
                      type="text" 
                      value={nin}
                      onChange={(e) => setNin(e.target.value)}
                      placeholder="11-digit NIN"
                      required
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload ID Document</label>
                    <div className="flex items-center space-x-3">
                      <label 
                        htmlFor="kyc-file" 
                        className="cursor-pointer px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all flex items-center"
                      >
                        <UploadCloud className="w-4 h-4 mr-2 text-gray-500" />
                        Choose File
                      </label>
                      <input 
                        id="kyc-file" 
                        type="file" 
                        className="sr-only" 
                        accept="image/*"
                        onChange={(e) => {
                          if(e.target.files?.[0]) {
                            setSelectedDocFile(e.target.files[0]);
                            setDocFileName(e.target.files[0].name);
                          }
                        }}
                      />
                      <span className="text-xs text-gray-500 truncate max-w-[150px]">{docFileName}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingKYC}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-70"
                  >
                    {isSubmittingKYC ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Identity'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}