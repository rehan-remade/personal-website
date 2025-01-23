import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Github, Twitter, Mail, Linkedin } from "lucide-react";


export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen max-w-3xl mx-auto px-4">
      {/* Profile Section */}
      <div className="flex flex-col items-center text-center space-y-6">
        <Image
          src="/profile_picture.jpg"
          alt="Profile"
          width={240}
          height={240}
          className="rounded-full aspect-square object-cover"
          priority
        />
        
        <h1 className="text-4xl font-bold">Rehan Sheikh</h1>
        <h2 className="text-xl text-muted-foreground">I like to build things.</h2>
        
        <p className="text-muted-foreground max-w-lg">
          I'm an engineer that loves hard problems, currently focusing on AI particularly diffusion models. Currently CTO @ <Link href="https://www.remade.ai/" className="underline">Remade AI (YC S24)</Link> and living in San Francisco.
        </p>

        <Button asChild className="mt-4">
          <Link href="/blog">
            Read my blog →
          </Link>
        </Button>
      </div>

      {/* Get in Touch Section */}
      <div className="mt-24 text-center">
        <h2 className="text-2xl font-bold mb-4">Get in touch</h2>
        <p className="text-muted-foreground mb-8">
          Although I'm not actively looking for job opportunities, my inbox is still
          open for you. Feel free to ask me anything!
        </p>
        
        <div className="flex gap-4 justify-center">
          <Button asChild variant="default">
            <Link href="mailto:rehan@remade.ai">
              👋 Say hello
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="https://app.apollo.io/#/meet/rehan_sheikh_70e/30-min" target="_blank" rel="noopener noreferrer">
              Schedule a meeting
            </Link>
          </Button>
        </div>
      </div>

      {/* Social Links */}
      <div className="flex gap-6 mt-16">
        <Link href="https://github.com/rehan-remade" className="text-muted-foreground hover:text-foreground">
          <Github className="h-6 w-6" />
        </Link>
        <Link href="https://x.com/rehan_shei" className="text-muted-foreground hover:text-foreground">
          <Twitter className="h-6 w-6" />
        </Link>
        <Link href="mailto:rehan@remade.ai" className="text-muted-foreground hover:text-foreground">
          <Mail className="h-6 w-6" />
        </Link>
        <Link href="https://linkedin.com/in/rehan-sheikh" className="text-muted-foreground hover:text-foreground">
          <Linkedin className="h-6 w-6" />
        </Link>
      </div>
    </main>
  );
}
