import SiteHeader from "@/components/layout/SiteHeader";
import Footer from "@/components/layout/Footer";
import { TERMS_COPY } from "@/content/landing";

export default function TermsPage() {
  return (
    <>
      <div className="legal">
        <SiteHeader />
        <main className="legal-main">
          <h1 className="legal-heading">Terms of Use</h1>
          <p>{TERMS_COPY.intro}</p>
          <p>{TERMS_COPY.waitlist}</p>
          <p>{TERMS_COPY.status}</p>
          <p>{TERMS_COPY.ip}</p>
        </main>
      </div>
      <Footer />
    </>
  );
}
