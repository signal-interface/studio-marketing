import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { PRIVACY_COPY } from "@/content/landing";

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="pt-32 pb-20 px-8">
        <div className="max-w-[720px] mx-auto">
          <h1 className="text-3xl font-bold text-text mb-8">Privacy Policy</h1>
          <div className="prose prose-slate max-w-none text-text-secondary leading-[1.8]">
            <p>{PRIVACY_COPY.intro}</p>
            <p>{PRIVACY_COPY.usage}</p>
            <p>{PRIVACY_COPY.emails}</p>
            <p>
              For questions, contact us at{" "}
              <a
                href="https://faradaycapitalsystems.com"
                className="text-accent hover:text-accent-dark"
              >
                faradaycapitalsystems.com
              </a>
              .
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
