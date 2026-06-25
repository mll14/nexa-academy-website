"use client";

import dynamic from "next/dynamic";

export const ChatWidgetClient = dynamic(
  () => import("./ChatWidget").then((m) => ({ default: m.ChatWidget })),
  { ssr: false },
);
