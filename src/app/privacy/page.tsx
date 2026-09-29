import SiteHeader from "@/components/layout/SiteHeader";
import Footer from "@/components/layout/Footer";
import { PRIVACY_COPY } from "@/content/landing";

export default function PrivacyPage() {
  return (
    <>
      <div className="legal">
        <SiteHeader />
        <main className="legal-main">
          <h1 className="legal-heading">Privacy Policy</h1>
          <p>{PRIVACY_COPY.intro}</p>
          <p>{PRIVACY_COPY.usage}</p>
          <p>{PRIVACY_COPY.emails}</p>
          <p>For questions, contact us via <a href="https://faradaycapitalsystems.com">faradaycapitalsystems.com</a>.</p>
        </main>
      </div>
      <Footer />
    </>
  );
}
