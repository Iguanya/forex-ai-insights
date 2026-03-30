import React, { useState } from 'react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Alert } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from '../hooks/useAuth';

type DepositStep = 'amount' | 'qrcode' | 'verification';

interface DepositState {
  depositId: string | null;
  amount: string;
  currency: string;
  referenceNumber: string;
  walletAddress: string;
  networkName: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
}

export function DepositFlow() {
  const { user } = useAuth();
  const [step, setStep] = useState<DepositStep>('amount');
  const [deposit, setDeposit] = useState<DepositState>({
    depositId: null,
    amount: '',
    currency: 'USDT',
    referenceNumber: '',
    walletAddress: '',
    networkName: '',
    status: 'idle',
    message: '',
  });
  const [pollingActive, setPollingActive] = useState(false);

  const handleStep1 = async () => {
    if (!deposit.amount || parseFloat(deposit.amount) <= 0) {
      setDeposit(prev => ({ ...prev, status: 'error', message: 'Please enter a valid amount' }));
      return;
    }

    setDeposit(prev => ({ ...prev, status: 'loading' }));

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3000/api/deposits/step1/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(deposit.amount),
          currency: deposit.currency,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create deposit');
      }

      const data = await response.json();
      setDeposit(prev => ({
        ...prev,
        depositId: data.depositId,
        referenceNumber: data.referenceNumber,
        walletAddress: data.walletAddress,
        networkName: data.networkName,
        status: 'success',
        message: 'Deposit created. Proceed to scan QR code.',
      }));
      setTimeout(() => setStep('qrcode'), 1500);
    } catch (error: any) {
      setDeposit(prev => ({
        ...prev,
        status: 'error',
        message: error.message || 'Failed to create deposit',
      }));
    }
  };

  const handleStep2 = async () => {
    if (!deposit.depositId) return;

    setDeposit(prev => ({ ...prev, status: 'loading' }));

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3000/api/deposits/${deposit.depositId}/step2/qrcode`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch QR code data');
      }

      const data = await response.json();
      setDeposit(prev => ({
        ...prev,
        walletAddress: data.walletAddress || prev.walletAddress,
        networkName: data.chainNetwork || prev.networkName,
        status: 'success',
        message: 'Ready to receive payment. Scan the QR code below.',
      }));
      // Auto-transition to verification after a delay
      setTimeout(() => handleStep3(), 2000);
    } catch (error: any) {
      setDeposit(prev => ({
        ...prev,
        status: 'error',
        message: error.message || 'Failed to load QR code',
      }));
    }
  };

  const handleStep3 = async () => {
    if (!deposit.depositId) return;

    setDeposit(prev => ({ ...prev, status: 'loading' }));
    setPollingActive(true);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `http://localhost:3000/api/deposits/${deposit.depositId}/step3/status`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch deposit status');
      }

      const data = await response.json();
      setDeposit(prev => ({
        ...prev,
        status: data.status === 'confirmed' ? 'success' : data.status === 'failed' ? 'error' : 'idle',
        message: data.message,
      }));
      setStep('verification');
    } catch (error: any) {
      setDeposit(prev => ({
        ...prev,
        status: 'error',
        message: error.message || 'Failed to fetch status',
      }));
    }
  };

  // Poll for verification status every 5 seconds
  React.useEffect(() => {
    if (!pollingActive || !deposit.depositId) return;

    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(
          `http://localhost:3000/api/deposits/${deposit.depositId}/step3/status`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setDeposit(prev => ({
            ...prev,
            message: data.message,
          }));

          if (data.status !== 'pending') {
            setPollingActive(false);
            setDeposit(prev => ({
              ...prev,
              status: data.status === 'confirmed' ? 'success' : 'error',
            }));
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [pollingActive, deposit.depositId]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4 mb-8">
        {['amount', 'qrcode', 'verification'].map((s, i) => {
          let isActive = step === (s as DepositStep);
          let isComplete = false;
          
          if (step === 'verification') {
            isComplete = true;
          } else if (step === 'qrcode' && s === 'amount') {
            isComplete = true;
          }
          
          return (
            <div
              key={s}
              className={`flex items-center gap-2 pb-2 border-b-2 ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : isComplete
                  ? 'border-green-600 text-green-600'
                  : 'border-gray-300 text-gray-500'
              }`}
            >
              <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-current">
                <span className="text-white text-sm font-bold">{i + 1}</span>
              </div>
              <span className="text-sm font-medium">
                {s === 'amount' && 'Amount'}
                {s === 'qrcode' && 'QR Code'}
                {s === 'verification' && 'Verification'}
              </span>
            </div>
          );
        })}
      </div>

      {deposit.message && (
        <Alert className={deposit.status === 'error' ? 'bg-red-50 text-red-800' : deposit.status === 'success' ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'}>
          {deposit.message}
        </Alert>
      )}

      {step === 'amount' && (
        <Card className="p-6 space-y-4">
          <h2 className="text-2xl font-bold">Step 1: Enter Deposit Amount</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Amount</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={deposit.amount}
                onChange={(e) =>
                  setDeposit(prev => ({ ...prev, amount: e.target.value }))
                }
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Currency</label>
              <Select value={deposit.currency} onValueChange={(value) =>
                setDeposit(prev => ({ ...prev, currency: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDT">USDT</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="BNB">BNB</SelectItem>
                  <SelectItem value="ETH">ETH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleStep1}
              disabled={deposit.status === 'loading'}
              className="w-full"
            >
              {deposit.status === 'loading' ? 'Creating...' : 'Continue to QR Code'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'qrcode' && (
        <Card className="p-6 space-y-6">
          <h2 className="text-2xl font-bold">Step 2: Send Cryptocurrency</h2>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg space-y-4">
            <div className="flex justify-center">
              {deposit.depositId && (
                <QRCode
                  value={`${deposit.walletAddress}?amount=${deposit.amount}`}
                  size={256}
                  level="H"
                  includeMargin={true}
                  className="border-4 border-white"
                />
              )}
            </div>

            <div className="space-y-2 text-center">
              <p className="text-sm text-gray-600">Deposit Details</p>
              <div className="bg-white p-3 rounded border border-gray-200 space-y-2">
                <p className="font-mono text-xs break-all text-gray-700">{deposit.walletAddress}</p>
                {deposit.networkName && (
                  <p className="text-xs text-gray-500">Network: <strong>{deposit.networkName}</strong></p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Reference Number:</p>
              <div className="bg-white p-3 rounded border border-gray-200">
                <p className="font-mono text-sm font-bold text-gray-700">{deposit.referenceNumber}</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <p className="text-sm text-amber-900">
                <strong>Important:</strong> Send exactly <strong>{deposit.amount} {deposit.currency}</strong> to the wallet above.
                Include the reference number in the memo/note field if the blockchain supports it.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleStep2}
              disabled={deposit.status === 'loading'}
              className="w-full"
            >
              {deposit.status === 'loading' ? 'Loading...' : 'I Sent the Payment'}
            </Button>
            <Button
              onClick={() => setStep('amount')}
              variant="outline"
              className="w-full"
            >
              Back
            </Button>
          </div>
        </Card>
      )}

      {step === 'verification' && (
        <Card className="p-6 space-y-6">
          <h2 className="text-2xl font-bold">Step 3: Awaiting Verification</h2>

          <div className="space-y-4">
            {deposit.status === 'success' ? (
              <div className="bg-green-50 border border-green-200 p-6 rounded-lg text-center space-y-2">
                <div className="text-4xl">✅</div>
                <p className="text-lg font-semibold text-green-900">Deposit Confirmed!</p>
                <p className="text-sm text-green-700">Your funds have been added to your account.</p>
                <div className="bg-white p-3 rounded mt-4">
                  <p className="text-xs text-gray-600">Amount</p>
                  <p className="font-bold text-lg">{deposit.amount} {deposit.currency}</p>
                </div>
              </div>
            ) : deposit.status === 'error' ? (
              <div className="bg-red-50 border border-red-200 p-6 rounded-lg text-center space-y-2">
                <div className="text-4xl">❌</div>
                <p className="text-lg font-semibold text-red-900">Deposit Rejected</p>
                <p className="text-sm text-red-700">Please contact support for more information.</p>
                <Button
                  onClick={() => {
                    setStep('amount');
                    setDeposit({
                      depositId: null,
                      amount: '',
                      currency: 'USDT',
                      referenceNumber: '',
                      walletAddress: '',
                      networkName: '',
                      status: 'idle',
                      message: '',
                    });
                  }}
                  className="w-full mt-4"
                >
                  Try Another Deposit
                </Button>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg space-y-4">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-300 border-t-blue-600"></div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold text-blue-900">Verifying Your Deposit</p>
                  <p className="text-sm text-blue-700">
                    This usually takes 5-15 minutes. Please don't close this window.
                  </p>
                  <div className="bg-white p-3 rounded mt-4">
                    <p className="text-xs text-gray-600">Reference Number</p>
                    <p className="font-mono font-bold text-sm">{deposit.referenceNumber}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {(deposit.status === 'success' || deposit.status === 'error') && (
            <Button
              onClick={() => window.location.href = '/trader/dashboard'}
              className="w-full"
            >
              Back to Dashboard
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
