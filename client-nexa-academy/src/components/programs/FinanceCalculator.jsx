import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet } from "lucide-react";

const VALID_PLANS = ["one-time", "2-installments", "3-installments"];

export default function FinanceCalculator({
  programList,
  initialPlan = "one-time",
}) {
  const [selectedId, setSelectedId] = useState(String(programList[0]?.id));
  const [plan, setPlan] = useState(
    VALID_PLANS.includes(initialPlan) ? initialPlan : "one-time",
  );

  const program =
    programList.find((p) => String(p.id) === selectedId) || programList[0];
  const basePrice = program?.price ?? 150000;
  const inst2Per = Math.round((basePrice * 1.1) / 2 / 500) * 500;
  const inst2Total = inst2Per * 2;
  const inst3Per = Math.round((basePrice * 1.2) / 3 / 500) * 500;
  const inst3Total = inst3Per * 3;

  const summary =
    plan === "one-time"
      ? {
          total: basePrice,
          per: basePrice,
          count: 1,
          label: "One-time payment",
          savings: inst3Total - basePrice,
          savingsLabel: "vs 3-instalment plan",
        }
      : plan === "3-installments"
        ? {
            total: inst3Total,
            per: inst3Per,
            count: 3,
            label: "3 instalments",
            savings: 0,
            savingsLabel: "",
          }
        : {
            total: inst2Total,
            per: inst2Per,
            count: 2,
            label: "2 instalments",
            savings: inst3Total - inst2Total,
            savingsLabel: "vs 3-instalment plan",
          };

  return (
    <section className="w-full">
      <div className="rounded-2xl border border-border bg-background p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold">
            Finance Calculator
          </h2>
        </div>

        <Separator />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Choose Program</label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a program" />
                </SelectTrigger>
                <SelectContent>
                  {programList.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Plan</label>
              <Tabs value={plan} onValueChange={setPlan}>
                <TabsList className="w-full">
                  <TabsTrigger value="one-time" className="flex-1">
                    One-time
                  </TabsTrigger>
                  <TabsTrigger value="2-installments" className="flex-1">
                    2 Instalments
                  </TabsTrigger>
                  <TabsTrigger value="3-installments" className="flex-1">
                    3 Instalments
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
            <p className="text-sm text-muted-foreground">Estimated Total</p>
            <p className="text-3xl sm:text-4xl font-bold text-primary">
              KSh {summary.total.toLocaleString()}
            </p>
            <Separator />
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex justify-between">
                <span>Plan</span>
                <span className="font-medium text-foreground">
                  {summary.label}
                </span>
              </li>
              <li className="flex justify-between">
                <span>
                  {summary.count === 1 ? "Amount due" : "Per instalment"}
                </span>
                <span className="font-medium text-foreground">
                  KSh {summary.per.toLocaleString()}
                </span>
              </li>
              {summary.savings > 0 && (
                <li className="flex justify-between text-green-600 font-semibold">
                  <span>You save ({summary.savingsLabel})</span>
                  <span>KSh {summary.savings.toLocaleString()}</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
