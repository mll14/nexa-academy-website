import { Header } from "@/components/sections/landing-page/header";
import { Footer } from "@/components/sections/landing-page/Footer";

export default function StudentLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 w-full">
        <div className="p-4 lg:p-8 max-w-6xl mx-auto">{children}</div>
      </main>

      <Footer />
    </div>
  );
}
