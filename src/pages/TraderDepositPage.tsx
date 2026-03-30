import React from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { DepositFlow } from '../components/DepositFlow';
import { Card } from '../components/ui/card';

export function TraderDepositPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deposit Funds</h1>
          <p className="text-gray-600 mt-1">
            Complete the 3-step process to deposit cryptocurrency into your trading account
          </p>
        </div>

        <Card className="bg-blue-50 border-blue-200 p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 How it works:</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Enter the amount you want to deposit</li>
            <li>Scan the QR code or copy the wallet address and send the exact amount</li>
            <li>Wait for admin verification (usually 5-15 minutes)</li>
          </ol>
        </Card>

        <DepositFlow />
      </div>
    </DashboardLayout>
  );
}
