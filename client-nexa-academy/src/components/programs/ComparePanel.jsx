import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function ComparePanel({ programs }) {
  if (programs.length < 2) {
    return (
      <Card className="border border-border rounded-2xl">
        <CardContent className="p-5 text-sm text-muted-foreground">
          Select 2 or more programs from the cards below to see a side-by-side
          comparison.
        </CardContent>
      </Card>
    );
  }

  const rows = [
    { label: "Duration", key: "duration" },
    { label: "Level", key: "level" },
    { label: "Graduates", key: "students" },
    { label: "Next Intake", key: "nextIntake" },
    { label: "Deadline", key: "applicationDeadline" },
    { label: "Seats Left", key: "seatsRemaining" },
  ];

  return (
    <Card className="border border-border rounded-2xl overflow-hidden">
      <CardContent className="p-0">
        <div
          className="grid text-sm"
          style={{
            gridTemplateColumns: `repeat(${programs.length + 1}, minmax(0, 1fr))`,
          }}
        >
          <div className="bg-muted/30 p-4 font-medium text-muted-foreground" />
          {programs.map((p) => (
            <div
              key={p.id}
              className="p-4 font-semibold border-l border-border"
            >
              {p.title}
            </div>
          ))}

          {rows.map((row) => (
            <React.Fragment key={row.key}>
              <div className="bg-muted/30 p-3 text-muted-foreground border-t border-border">
                {row.label}
              </div>
              {programs.map((p) => (
                <div
                  key={`${p.id}-${row.key}`}
                  className="p-3 border-t border-l border-border"
                >
                  {p[row.key]}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
