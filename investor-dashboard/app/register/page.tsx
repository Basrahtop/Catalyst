"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Loader2, AlertCircle, Building2, User, CheckCircle2 } from 'lucide-react';

type InvestorType = 'individual' | 'institution';

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [investorType, setInvestorType] = useState<InvestorType | null>(null);
  
  // Common fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  
  // Individual fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nin, setNin] = useState(''); // National ID for KYC
  
  // Institution fields
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('');
  const [rcNumber, setRcNumber] = useState(''); // Registration number
  const [contactPersonName, setContactPersonName] = useState('');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleInvestorTypeSelect = (type: InvestorType) => {
    setInvestorType(type);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const payload: any = {
        email,
        password,
        investorType,
        phone,
      };

      if (investorType === 'individual') {
        payload.firstName = firstName;
        payload.lastName = lastName;
        payload.nin = nin;
      } else {
        payload.orgName = orgName;
        payload.orgType = orgType;
        payload.rcNumber = rcNumber;
        payload.contactPersonName = contactPersonName;
      }

      await api.post('/auth/register-investor', payload);

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Join as an Investor</h1>
            <p className="text-gray-600 mt-2">Choose your investor type</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <button
              onClick={() => handleInvestorTypeSelect('individual')}
              className="p-8 border-2 border-gray-300 rounded-xl
                         hover:border-indigo-500 hover:bg-indigo-50
                         transition-all duration-200 group"
            >
              <User className="w-16 h-16 text-indigo-600 mx-auto mb-4
                               group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Individual Investor</h3>
              <p className="text-gray-600 text-sm">
                Invest as an individual person with personal funds
              </p>
            </button>

            <button
              onClick={() => handleInvestorTypeSelect('institution')}
              className="p-8 border-2 border-gray-300 rounded-xl
                         hover:border-purple-500 hover:bg-purple-50
                         transition-all duration-200 group"
            >
              <Building2 className="w-16 h-16 text-purple-600 mx-auto mb-4
                                    group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Institutional Investor</h3>
              <p className="text-gray-600 text-sm">
                Register as a bank, fund, or organization
              </p>
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold">
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        <button
          onClick={() => setStep(1)}
          className="text-gray-600 hover:text-gray-900 mb-4"
        >
          ← Back
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {investorType === 'individual' ? 'Individual' : 'Institutional'} Registration
          </h1>
          <p className="text-gray-600 mt-2">Complete your investor profile</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {investorType === 'individual' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg
                               focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg
                               focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NIN (National ID) *
                </label>
                <input
                  type="text"
                  required
                  value={nin}
                  onChange={(e) => setNin(e.target.value)}
                  placeholder="12345678901"
                  maxLength={11}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg
                             focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Required for KYC verification</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg
                             focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Type *
                </label>
                <select
                  required
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg
                             focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select type</option>
                  <option value="bank">Bank</option>
                  <option value="investment_fund">Investment Fund</option>
                  <option value="venture_capital">Venture Capital</option>
                  <option value="ngo">NGO</option>
                  <option value="government_agency">Government Agency</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RC Number *
                </label>
                <input
                  type="text"
                  required
                  value={rcNumber}
                  onChange={(e) => setRcNumber(e.target.value)}
                  placeholder="RC1234567"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg
                             focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Business registration number</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person Name *
                </label>
                <input
                  type="text"
                  required
                  value={contactPersonName}
                  onChange={(e) => setContactPersonName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg
                             focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+234 800 000 0000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password *
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-6 rounded-lg font-semibold text-white
                       bg-gradient-to-r from-indigo-600 to-purple-600
                       hover:from-indigo-700 hover:to-purple-700
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                       transition-all duration-200
                       disabled:opacity-70 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Register'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
