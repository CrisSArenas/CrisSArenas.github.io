import { mount } from '@/lib/mount';
import '@/components/home/home.css';
import { Hero } from '@/components/home/Hero';
import { PortfolioSection } from '@/components/home/PortfolioSection';
import { AiSection } from '@/components/home/AiSection';
import { WorkSection } from '@/components/home/WorkSection';
import { ResearchAndLab, AboutSection, ContactSection } from '@/components/home/ClosingSections';

function Page() {
  return (
    <>
      <Hero />
      <PortfolioSection />
      <AiSection />
      <WorkSection />
      <ResearchAndLab />
      <AboutSection />
      <ContactSection />
    </>
  );
}
mount(<Page />);
