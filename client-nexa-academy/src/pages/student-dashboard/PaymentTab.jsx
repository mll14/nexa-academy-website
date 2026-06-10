import { useState } from "react";
import PaystackPop from "@paystack/inline-js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, CreditCard, Loader2, RefreshCw } from "lucide-react";
import { statusText } from "@/lib/utils";
import paymentService from "@/services/paymentService";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import DepositProgress from "@/components/shared/DepositProgress";

const MIN_PAYMENT = 100; // KSh 100 floor — any instalment amount is allowed

export default function PaymentTab({ enrollment, payments, onPaymentDone, applicationStatus, depositedAmount = 0 }) {
  const { currentUser } = useAuth();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [recheckingId, setRecheckingId] = useState(null);

  const handleRecheck = async (payment) => {
    const id = payment.payment_id || payment.id;
    setRecheckingId(id);
    const result = await paymentService.checkPaymentStatus(id);
    setRecheckingId(null);
    if (!result.success) {
      toast.error(result.error || "Could not check payment status");
      return;
    }
    const updated = result.data?.payment;
    const ps = result.data?.paystack_status;
    if (updated?.status === "completed") {
      toast.success("Payment confirmed — status updated to completed!");
      if (onPaymentDone) onPaymentDone();
    } else if (updated?.status === "failed") {
      toast.error("Payment failed on Paystack's end. Please try a new payment.");
      if (onPaymentDone) onPaymentDone();
    } else {
      toast(`Still pending on Paystack (${ps || "unknown"}). Try again later.`);
    }
  };

  const balance = Number(enrollment?.balance ?? 0);
  const amountPaid = Number(enrollment?.amountPaid ?? 0);
  const totalFee = Number(enrollment?.amount ?? 0);
  const isFullyPaid = balance <= 0 && totalFee > 0;

  const enteredAmount = Number(amount);
  const amountValid =
    enteredAmount >= MIN_PAYMENT &&
    enteredAmount <= balance &&
    enteredAmount > 0;

  const handlePayWithPaystack = async () => {
    if (!amountValid) {
      if (enteredAmount < MIN_PAYMENT) {
        toast.error(`Minimum payment is KSh ${MIN_PAYMENT.toLocaleString()}`);
      } else if (enteredAmount > balance) {
        toast.error("Amount exceeds outstanding balance");
      }
      return;
    }

    setLoading(true);
    const result = await paymentService.initializePayment({
      amount: enteredAmount,
      programId: enrollment?.programId,
      paymentType: "installment",
      email: currentUser?.email,
    });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error || "Could not initialize payment");
      return;
    }

    const data = result.data;
    // If backend simulated the payment (e.g., Paystack integration closed in DEBUG), finish here
    if (data && data.simulated) {
      toast.success("Payment recorded (simulated)");
      if (onPaymentDone) onPaymentDone();
      return;
    }
    const publicKey = data.public_key || paymentService.getPublicKey();
    const reference =
      data.reference || (data.data && data.data.reference) || data.access_code;

    if (!publicKey || !reference) {
      toast.error(
        "Missing Paystack credentials — check VITE_PAYSTACK_PUBLIC_KEY",
      );
      return;
    }

    const paystack = new PaystackPop();
    try {
      paystack.newTransaction({
        key: publicKey,
        email: currentUser?.email,
        amount: enteredAmount * 100,
        currency: "KES",
        ref: reference,
        access_code: data.access_code || data.accessCode,
        onSuccess: async (transaction) => {
          toast.loading("Verifying payment…");
          const verifyResult = await paymentService.verifyPayment(
            transaction.reference,
          );
          toast.dismiss();
          if (
            verifyResult.success &&
            (verifyResult.data?.status === "success" ||
              verifyResult.data?.payment?.status === "completed")
          ) {
            toast.success("Payment successful! 🎉");
            setAmount("");
            if (onPaymentDone) onPaymentDone();
          } else {
            toast.error("Payment verification failed — contact support");
          }
        },
        onCancel: () => {
          toast("Payment cancelled");
        },
      });
    } catch {
      const authUrl =
        data.authorization_url || (data.data && data.data.authorization_url);
      if (authUrl) {
        window.open(authUrl, "_blank");
        toast("Opened Paystack checkout in a new tab");
      } else {
        toast.error("Failed to open Paystack checkout popup");
      }
    }
  };

  return (
    <div className="space-y-5">
      <DepositProgress
        depositedAmount={depositedAmount}
        applicationStatus={applicationStatus}
        totalFee={totalFee}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Program Fee", value: `KSh ${totalFee.toLocaleString()}` },
          { label: "Total Paid", value: `KSh ${amountPaid.toLocaleString()}` },
          {
            label: "Balance Due",
            value: `KSh ${balance.toLocaleString()}`,
            highlight: !isFullyPaid,
          },
        ].map(({ label, value, highlight }) => (
          <Card key={label} className="border rounded-2xl">
            <CardContent className="p-4 space-y-1">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p
                className={`font-bold text-lg ${highlight ? "text-destructive" : ""}`}
              >
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Make a Payment</h3>
            {isFullyPaid && (
              <Badge className="bg-green-100 text-green-700 border-0">
                Fully Paid ✓
              </Badge>
            )}
          </div>
          <Separator />

          {isFullyPaid ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <p className="font-semibold text-lg">All fees settled</p>
              <p className="text-sm text-muted-foreground">
                Your program fees are fully paid. Thank you!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pay-amount">Amount (KSh)</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  placeholder={`Min KSh ${MIN_PAYMENT.toLocaleString()}`}
                  value={amount}
                  min={MIN_PAYMENT}
                  max={balance}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {applicationStatus === "interview_completed"
                    ? `Pay any amount — enrollment unlocks once KSh 10,000 total is deposited`
                    : `Outstanding balance: KSh ${balance.toLocaleString()}`}
                </p>
              </div>

              <Button
                onClick={handlePayWithPaystack}
                disabled={loading || isFullyPaid || !amountValid}
                className="w-full gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Preparing…
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" /> Pay KSh{" "}
                    {enteredAmount > 0 ? enteredAmount.toLocaleString() : "—"}{" "}
                    via Paystack
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Secured by Paystack · M-Pesa, Card & Bank supported
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border rounded-2xl">
        <CardContent className="p-6 space-y-3">
          <h3 className="font-semibold">Payment History</h3>
          <Separator />
          {!payments?.length ? (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            payments.map((p) => {
              const pid = p.payment_id || p.id;
              const isRechecking = recheckingId === pid;
              return (
                <div
                  key={pid}
                  className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      KSh {parseFloat(p.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(
                        p.payment_date || p.created_at,
                      ).toLocaleDateString("en-KE")}
                      {p.payment_reference
                        ? ` · Ref: ${p.payment_reference}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        p.status === "completed"
                          ? "bg-green-100 text-green-700 border-0"
                          : p.status === "pending"
                            ? "bg-amber-100 text-amber-700 border-0"
                            : p.status === "failed"
                              ? "bg-red-100 text-red-700 border-0"
                              : "bg-muted text-muted-foreground border-0"
                      }
                    >
                      {statusText(p.status)}
                    </Badge>
                    {p.status === "pending" && p.payment_reference && (
                      <button
                        onClick={() => handleRecheck(p)}
                        disabled={isRechecking}
                        title="Check if this payment went through"
                        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRechecking ? "animate-spin" : ""}`} />
                        {isRechecking ? "Checking…" : "Recheck"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
