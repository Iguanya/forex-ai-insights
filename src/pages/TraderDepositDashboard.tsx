import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, AlertCircle, CheckCircle, Clock, QrCode } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

interface Deposit {
  id: string;
  trader_id: string;
  reference_number: string;
  amount: number;
  currency: "USDT" | "USDC" | "BNB" | "ETH";
  status: "pending" | "confirmed" | "failed" | "cancelled";
  wallet_address?: string;
  transaction_hash?: string;
  notes?: string;
  created_at: string;
}

export default function TraderDepositDashboard() {
  const { traderProfile, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastDeposit, setLastDeposit] = useState<Deposit | null>(null);

  // Form state
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"USDT" | "USDC" | "BNB" | "ETH">("USDT");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (user) {
      fetchDeposits();
    }
  }, [user]);

  const getHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/deposits`, {
        headers: getHeaders(),
      });

      if (!response.ok) throw new Error("Failed to fetch deposits");

      const result = await response.json();
      setDeposits(result);
    } catch (error: any) {
      console.error("Error fetching deposits:", error);
      toast({
        title: "Error",
        description: "Could not fetch deposits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount) {
      toast({
        title: "Validation error",
        description: "Please enter an amount",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`${API_BASE_URL}/deposits`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency,
          notes: notes || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit deposit");
      }

      const deposit = await response.json();

      toast({
        title: "Success",
        description: `Deposit of ${amount} ${currency} created. Reference: ${deposit.reference_number}`,
      });

      // Store deposit details to show wallet address
      setLastDeposit({
        id: deposit.id,
        trader_id: user?.id || '',
        reference_number: deposit.reference_number,
        amount: parseFloat(amount),
        currency,
        status: 'pending',
        wallet_address: deposit.wallet_address,
        notes,
        created_at: new Date().toISOString()
      });

      // Keep dialog open to show wallet address
      setTimeout(() => {
        // Reset form but keep dialog open to show wallet instructions
        setAmount("");
        setCurrency("USDT");
        setNotes("");
      }, 500);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: Deposit["status"]) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "failed":
      case "cancelled":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: Deposit["status"]) => {
    const variants: Record<Deposit["status"], "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "default",
      failed: "destructive",
      cancelled: "destructive",
    };

    return (
      <Badge variant={variants[status]} className="capitalize flex items-center gap-1">
        {getStatusIcon(status)}
        {status}
      </Badge>
    );
  };

  const accountBalance = typeof traderProfile?.account_balance === 'number' ? traderProfile.account_balance : 0;
  
  const totalPending = Math.max(0, deposits
    .filter(d => d.status === "pending")
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0));

  const totalConfirmed = Math.max(0, deposits
    .filter(d => d.status === "confirmed")
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0));

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-display">Deposit Funds</h1>
        <p className="text-muted-foreground mt-1">Send funds to your trading account</p>
      </div>

      {/* Account Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="gradient-card border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Account Balance</p>
            <p className="text-3xl font-bold font-mono mt-2">
              ${accountBalance.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Total Deposits</p>
            <p className="text-3xl font-bold font-mono mt-2">
              ${totalConfirmed.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Pending</p>
            <p className="text-3xl font-bold font-mono mt-2 text-warning">
              ${totalPending.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Deposit Instructions */}
      <Card className="gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Deposit Instructions</CardTitle>
          <CardDescription>How to send funds to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Submit a deposit below and our team will process it within 24 hours. Make sure to provide accurate transaction details.
          </p>
        </CardContent>
      </Card>

      {/* New Deposit Button */}
      <div className="flex flex-col md:flex-row gap-3">
        <Button
          size="lg"
          onClick={() => navigate("/trader/deposit")}
          className="flex-1 md:flex-auto"
        >
          <QrCode className="mr-2 h-4 w-4" />
          Quick Deposit (QR Code)
        </Button>
        <Button
          size="lg"
          onClick={() => setShowDepositDialog(true)}
          variant="outline"
          className="flex-1 md:flex-auto"
        >
          <Upload className="mr-2 h-4 w-4" />
          Manual Deposit (Legacy)
        </Button>
      </div>

      {/* Deposits History */}
      <Card className="gradient-card border-border/50">
        <CardHeader>
          <CardTitle>Deposit History</CardTitle>
          <CardDescription>Track all your deposit submissions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : deposits.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No deposits yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Reference</th>
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((deposit) => (
                    <tr key={deposit.id} className="border-b border-border/30 hover:bg-background/30">
                      <td className="py-3 px-2">
                        {new Date(deposit.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 font-mono font-semibold">
                        {deposit.amount} {deposit.currency}
                      </td>
                      <td className="py-3 px-2 text-xs font-mono">{deposit.reference_number}</td>
                      <td className="py-3 px-2">{getStatusBadge(deposit.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deposit Dialog */}
      <Dialog open={showDepositDialog} onOpenChange={(open) => {
        setShowDepositDialog(open);
        if (!open) {
          setLastDeposit(null);
          setAmount("");
          setCurrency("USDT");
          setNotes("");
          fetchDeposits();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{lastDeposit ? "Deposit Payment Instructions" : "Submit Deposit"}</DialogTitle>
            <DialogDescription>
              {lastDeposit ? "Send funds to your trading account" : "Enter deposit details"}
            </DialogDescription>
          </DialogHeader>

          {lastDeposit ? (
            // Show wallet address instructions
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-3">
                <p className="text-sm font-semibold text-blue-900">Deposit Details</p>
                
                <div className="space-y-2">
                  <p className="text-xs text-gray-600">Reference Number:</p>
                  <div className="bg-white p-2 rounded border border-gray-300 flex items-center justify-between">
                    <code className="text-xs font-mono">{lastDeposit.reference_number}</code>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(lastDeposit.reference_number)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-gray-600">Wallet Address:</p>
                  <div className="bg-white p-2 rounded border border-gray-300 flex items-center justify-between">
                    <code className="text-xs font-mono break-all">{lastDeposit.wallet_address || 'Loading...'}</code>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(lastDeposit.wallet_address || '')}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3 rounded">
                  <p className="text-xs text-amber-900">
                    <strong>Send exactly {lastDeposit.amount} {lastDeposit.currency}</strong> to the address above. Include the reference number in the memo if possible.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => setShowDepositDialog(false)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          ) : (
            // Show form
            <form onSubmit={handleSubmitDeposit} className="space-y-4">
              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (USD)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={(val) => setCurrency(val as any)}>
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

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information about this deposit..."
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDepositDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Deposit"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
