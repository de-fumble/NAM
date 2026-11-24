import { Bento, BodyRail, Dealers, Featured, FinalCTA, Hero, PartsSection, ProsSection, TrustStrip, Voices } from "@/components/home";

export default function Home() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <BodyRail />
      <Featured />
      <Bento />
      <ProsSection />
      <PartsSection />
      <Dealers />
      <Voices />
      <FinalCTA />
    </>
  );
}
