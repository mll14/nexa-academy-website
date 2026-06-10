import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
// pricingPlans import removed — this section shows installment comparisons instead
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

export function PricingPlansSection() {
  return (
    <section className="w-full py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto mb-8">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Payment plans
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Pay upfront for the best rate, or spread the cost into 2 or 3 easy
            instalments.
          </p>
        </div>

        {/* Comparison cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              id: "one",
              calculatorPlan: "one-time",
              title: "One-time payment",
              priceLabel: "Pay once",
              description:
                "Best if you prefer a single upfront payment and save on admin fees.",
              features: [
                "Full course fee paid upfront",
                "No instalment surcharge",
                "Priority enrollment processing",
              ],
              highlight: true,
            },
            {
              id: "two",
              calculatorPlan: "2-installments",
              title: "2-instalment plan",
              priceLabel: "Split into 2 payments",
              description:
                "Pay half up front and the remainder before course start — flexible and popular.",
              features: [
                "10% surcharge on total fee",
                "2 equal payments",
                "Suitable when you need time to budget",
              ],
              highlight: false,
            },
            {
              id: "three",
              calculatorPlan: "3-installments",
              title: "3-instalment plan",
              priceLabel: "Split into 3 payments",
              description:
                "Spread the cost over three equal payments for maximum flexibility.",
              features: [
                "20% surcharge on total fee",
                "3 equal payments",
                "Ideal for longer budget planning",
              ],
              highlight: false,
            },
          ].map((plan) => (
            <Card
              key={plan.id}
              className={`group relative rounded-2xl border transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${
                plan.highlight
                  ? "border-primary bg-primary/5 shadow-lg"
                  : "border-border bg-background"
              }`}
            >
              {plan.highlight && (
                <div className="absolute top-4 right-4 text-xs font-medium bg-primary text-white px-2 py-1 rounded-full">
                  Recommended
                </div>
              )}

              <CardContent className="p-6 flex flex-col h-full space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">{plan.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </div>

                <div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold">
                      {plan.priceLabel}
                    </span>
                  </div>
                </div>

                <ul className="space-y-2 text-sm">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  className={`mt-auto w-full ${
                    plan.highlight
                      ? "bg-primary text-white hover:bg-primary/90"
                      : ""
                  }`}
                  variant={plan.highlight ? "default" : "outline"}
                >
                  <Link
                    to={`/programs?plan=${plan.calculatorPlan}#finance-calculator`}
                  >
                    View calculator
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
