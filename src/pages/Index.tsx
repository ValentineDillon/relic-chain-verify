import { useEffect, useState } from "react";
import Header from "@/components/Header";
import CollectibleCard from "@/components/CollectibleCard";
import ProvenanceFooter from "@/components/ProvenanceFooter";
import heroBg from "@/assets/hero-bg.jpg";
import itemWatch from "@/assets/item-watch.jpg";
import itemNecklace from "@/assets/item-necklace.jpg";
import itemCar from "@/assets/item-car.jpg";
import itemWine from "@/assets/item-wine.jpg";

const Index = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const collectibles = [
    {
      id: 1,
      title: "Vintage Chronograph",
      image: itemWatch,
      owner: "0x7f9a...3c21",
      verified: true,
      encrypted: true,
    },
    {
      id: 2,
      title: "Royal Diamond Necklace",
      image: itemNecklace,
      owner: "0x4f2a...1b89",
      verified: true,
      encrypted: true,
    },
    {
      id: 3,
      title: "Classic '57 Corvette",
      image: itemCar,
      owner: "0x8e3c...4d67",
      verified: true,
      encrypted: true,
    },
    {
      id: 4,
      title: "Château Vintage 1945",
      image: itemWine,
      owner: "0x3d1f...9c45",
      verified: true,
      encrypted: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroBg} 
            alt="Hero background" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/50 to-background" />
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className={`text-center max-w-4xl mx-auto transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            <h2 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-primary via-encryption to-luxury bg-clip-text text-transparent leading-tight">
              Own. Prove. Protect.
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              Register encrypted metadata of rare items. Ownership proofs decrypt during transfer.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="flex items-center gap-2 text-sm text-encryption">
                <div className="h-2 w-2 rounded-full bg-encryption animate-pulse-glow" />
                <span>Blockchain secured</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-luxury">
                <div className="h-2 w-2 rounded-full bg-luxury animate-pulse-glow" />
                <span>Encrypted metadata</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-primary">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
                <span>Verified provenance</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase Wall */}
      <section className="py-24 relative">
        <div className="container mx-auto px-6">
          <div className={`text-center mb-16 transition-all duration-1000 delay-300 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            <h3 className="text-4xl font-bold mb-4">Encrypted Showcase</h3>
            <p className="text-lg text-muted-foreground">
              Hover over items to reveal their encrypted protection
            </p>
          </div>
          
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 transition-all duration-1000 delay-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            {collectibles.map((item) => (
              <div key={item.id} className="animate-fade-in">
                <CollectibleCard {...item} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProvenanceFooter />
    </div>
  );
};

export default Index;
