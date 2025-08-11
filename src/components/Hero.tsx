import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-doctor.jpg";
import { Stethoscope } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-hero">
      <div className="hero-orb" aria-hidden="true" />
      <div className="container mx-auto px-6 py-20 md:py-28">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <header>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                AI Doctor Chatbot – Agentic Health Assistant
              </h1>
              <p className="mt-4 text-lg text-muted-foreground max-w-prose">
                Get private, round-the-clock guidance on symptoms and next steps. This tool does not provide medical advice and is for educational purposes only.
              </p>
            </header>
            <div className="mt-8 flex items-center gap-4">
              <a href="#chat">
                <Button variant="hero" size="lg" className="group">
                  <Stethoscope className="opacity-90 group-hover:opacity-100 transition" />
                  Start Chat
                </Button>
              </a>
              <a href="#disclaimer" className="text-sm underline underline-offset-4 text-muted-foreground">
                Read disclaimer
              </a>
            </div>
          </div>
          <div className="relative">
            <img
              src={heroImage}
              alt="Illustration of an AI doctor assistant with medical UI elements"
              loading="lazy"
              className="w-full rounded-xl shadow-xl border"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
