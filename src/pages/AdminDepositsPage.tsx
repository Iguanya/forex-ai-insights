import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, Eye, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://144.172.112.31:3000/api";

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

export default function AdminDepositsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [transactionHash, setTransactionHash] = useState("");

  useEffect(() => {
    if (user?.role === "admin") {
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
      const response = await fetch(`${API_BASE_URL}/admin/deposits`, {
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

  const handleConfirmDeposit = async () => {
    if (!selectedDeposit) return;

    try {
      setActionLoading(selectedDeposit.id);

      const response = await fetch(
        `${API_BASE_URL}/admin/deposits/${selectedDeposit.id}/verify`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            action: "confirm",
            transaction_hash: transactionHash || undefined,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to confirm deposit");
      }

      toast({
        title: "Success",
        description: "Deposit confirmed",
      });

      setShowDetailDialog(false);
      setSelectedDeposit(null);
      setTransactionHash("");
      fetchDeposits();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectDeposit = async () => {
    if (!selectedDeposit) return;

    try {
      setActionLoading(selectedDeposit.id);

      const response = await fetch(
        `${API_BASE_URL}/admin/deposits/${selectedDeposit.id}/verify`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            action: "reject",
            transaction_hash: transactionHash || undefined,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reject deposit");
      }

      toast({
        title: "Success",
        description: "Deposit rejected",
      });

      setShowDetailDialog(false);
      setSelectedDeposit(null);
      setRejectionReason("");
      setTransactionHash("");
      fetchDeposits();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleShowDetails = (deposit: Deposit) => {
    setSelectedDeposit(deposit);
    setShowDetailDialog(true);
  };

  const getStatusBadge = (status: Deposit["status"]) => {
    const variants: Record<Deposit["status"], "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "default",
      failed: "destructive",
      cancelled: "destructive",
    };

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    );
  };

  const pendingDeposits = deposits.filter(d => d.status === "pending");
  const confirmedDeposits = deposits.filter(d => d.status === "confirmed");
  const totalPending = pendingDeposits.reduce((sum, d) => sum + d.amount, 0);
  const totalConfirmed = confirmedDeposits.reduce((sum, d) => sum + d.amount, 0);

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Access denied. Admin only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-display">Deposit Management</h1>
        <p className="text-muted-foreground mt-1">Review and approve trader deposits</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="gradient-card border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Total Deposits</p>
            <p className="text-3xl font-bold font-mono mt-2">
              ${(totalPending + totalConfirmed).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Pending Review</p>
            <p className="text-3xl font-bold font-mono mt-2 text-warning">
              {pendingDeposits.length} (${totalPending.toFixed(2)})
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Confirmed</p>
            <p className="text-3xl font-bold font-mono mt-2 text-success">
              {confirmedDeposits.length} (+${totalConfirmed.toFixed(2)})
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Deposits Table */}
      <Card className="gradient-card border-border/50">
        <CardHeader>
          <CardTitle>All Deposits</CardTitle>
          <CardDescription>
            {loading ? "Loading..." : `${deposits.length} total deposits`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : deposits.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No deposits found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Trader</th>
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Reference</th>
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((deposit) => (
                    <tr key={deposit.id} className="border-b border-border/30 hover:bg-background/30">
                      <td className="py-3 px-2">
                        {new Date(deposit.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 text-xs font-mono">{deposit.trader_id.substring(0, 8)}</td>
                      <td className="py-3 px-2 font-mono font-semibold">
                        {deposit.amount} {deposit.currency}
                      </td>
                      <td className="py-3 px-2 text-xs font-mono">{deposit.reference_number}</td>
                      <td className="py-3 px-2">{getStatusBadge(deposit.status)}</td>
                      <td className="py-3 px-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleShowDetails(deposit)}
                          disabled={actionLoading === deposit.id}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={(open) => {
        setShowDetailDialog(open);
        if (!open) {
          setSelectedDeposit(null);
          setRejectionReason("");
          setTransactionHash("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Deposit Details</DialogTitle>
            <DialogDescription>
              Reference: {selectedDeposit?.reference_number}
            </DialogDescription>
          </DialogHeader>

          {selectedDeposit && (
            <div className="space-y-4">
              {/* Deposit Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Amount</p>
                  <p className="text-lg font-mono font-bold">
                    {selectedDeposit.amount} {selectedDeposit.currency}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedDeposit.status)}</div>
                </div>
              </div>

              {/* Wallet Address */}
              {selectedDeposit.wallet_address && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                  <p className="text-xs font-semibold text-blue-900 uppercase mb-2">Wallet Address</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono break-all text-blue-800 flex-1">
                      {selectedDeposit.wallet_address}
                    </code>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(selectedDeposit.wallet_address || '')}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Trader Info */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Trader ID</p>
                <p className="text-sm font-mono mt-1">{selectedDeposit.trader_id}</p>
              </div>

              {/* Reference Number */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Reference</p>
                <p className="text-sm font-mono mt-1">{selectedDeposit.reference_number}</p>
              </div>

              {/* Date */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Submitted</p>
                <p className="text-sm mt-1">
                  {new Date(selectedDeposit.created_at).toLocaleString()}
                </p>
              </div>

              {/* Notes */}
              {selectedDeposit.notes && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Notes</p>
                  <p className="text-sm mt-1 text-muted-foreground">{selectedDeposit.notes}</p>
                </div>
              )}

              {/* Verification Form - only show if pending */}
              {selectedDeposit.status === "pending" && (
                <div className="space-y-3 pt-3 border-t border-border/30">
                  <div>
                    <Label htmlFor="txhash">Transaction Hash (optional)</Label>
                    <Input
                      id="txhash"
                      value={transactionHash}
                      onChange={(e) => setTransactionHash(e.target.value)}
                      placeholder="Enter blockchain transaction hash..."
                      className="mt-1 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <Label htmlFor="reason">Rejection Reason (if applicable)</Label>
                    <Textarea
                      id="reason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain why this deposit is being rejected..."
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {selectedDeposit.status === "pending" && (
                <DialogFooter>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleRejectDeposit}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === selectedDeposit.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Rejecting...
                      </>
                    ) : (
                      <>
                        <X className="mr-2 h-4 w-4" />
                        Reject
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    disabled={actionLoading !== null}
                    onClick={handleConfirmDeposit}
                  >
                    {actionLoading === selectedDeposit.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Confirm
                      </>
                    )}
                  </Button>
                </DialogFooter>
              )}

              {selectedDeposit.status !== "pending" && (
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDetailDialog(false)}
                  >
                    Close
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
