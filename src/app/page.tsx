import Entrance from "@/components/experience/Entrance";
import CreationCanvas from "@/components/experience/CreationCanvas";
import HowItWorks from "@/components/sections/HowItWorks";
import UseCases from "@/components/sections/UseCases";
import WaitlistForm from "@/components/forms/WaitlistForm";
import Footer from "@/components/layout/Footer";

export default function HomePage() {
  return (
    <>
      <Entrance />
      <div id="site-content">
        <main>
          <CreationCanvas />
          {/* Existing sections retained unchanged until Slice 3 rework. */}
          <HowItWorks />
          <UseCases />
          <WaitlistForm />
        </main>
        <Footer />
      </div>
    </>
  );
}
