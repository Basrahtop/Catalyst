import Navigation from '@/components/Navigation';
import HeroSection from '@/components/HeroSection';
import PlatformShowcase from '@/components/PlatformShowcase';
import VideoSection from '@/components/VideoSection';
import ThreeColumnValue from '@/components/ThreeColumnValue';
import StatsSection from '@/components/StatsSection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <HeroSection />
      <PlatformShowcase />
      <VideoSection />
      <ThreeColumnValue />
      <StatsSection />
      <Footer />
    </main>
  );
}

