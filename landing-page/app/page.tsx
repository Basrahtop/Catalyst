import Navigation from '@/components/Navigation';
import HeroSection from '@/components/HeroSection';
import ThreeColumnValue from '@/components/ThreeColumnValue';
import StatsSection from '@/components/StatsSection';
import TripleCTA from '@/components/TripleCTA';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <HeroSection />
      <ThreeColumnValue />
      <StatsSection />
      <TripleCTA />
      <Footer />
    </main>
  );
}

