import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { TERMS_COPY } from "@/content/landing";

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-32 pb-20 px-8">
        <div className="max-w-[720px] mx-auto">
          <h1 className="text-3xl font-bold text-text mb-8">Terms of Use</h1>
          <div className="prose prose-slate max-w-none text-text-secondary leading-[1.8]">
            <p>{TERMS_COPY.intro}</p>
            <p>{TERMS_COPY.waitlist}</p>
            <p>{TERMS_COPY.status}</p>
            <p>{TERMS_COPY.ip}</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
