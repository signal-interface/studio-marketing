import Entrance from "@/components/experience/Entrance";
import CreationCanvas from "@/components/experience/CreationCanvas";
import Possibility from "@/components/story/Possibility";
import Positioning from "@/components/story/Positioning";
import EarlyAccess from "@/components/story/EarlyAccess";
import Footer from "@/components/layout/Footer";

// One continuous experience: universe → canvas → creation →
// possibility → positioning → back into space → early access.
export default function HomePage() {
  return (
    <>
      <Entrance />
      <div id="site-content">
        <main>
          <CreationCanvas />
          <Possibility />
          <Positioning />
          <EarlyAccess />
        </main>
        <Footer />
      </div>
    </>
  );
}
