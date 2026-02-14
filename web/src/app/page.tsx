import Header from "@/components/Header";
import Hero from "@/components/Hero";
import KeyFigures from "@/components/KeyFigures";
import About from "@/components/About";
import Subsidiaries from "@/components/Subsidiaries";
import WhyUs from "@/components/WhyUs";
import Testimonials from "@/components/Testimonials";
import CTA from "@/components/CTA";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden bg-background-light">
      <Header />
      <main>
        <Hero />
        <KeyFigures />
        <About />
        <Subsidiaries />
        <WhyUs />
        <Testimonials />
        <CTA />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
