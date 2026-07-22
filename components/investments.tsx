import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";

const investments = [
  {
    name: "Anoria",
    url: "https://www.anoria.com/",
    description: "A wearable that reads and understands your emotions.",
    logo: "/investments/anoria.svg",
    logoWidth: 494,
    logoHeight: 112,
    logoClassName: "h-6 w-auto",
  },
  {
    name: "Adialante",
    url: "https://adialante.com/",
    description: "Mobile, diagnostic-grade MRI delivered to clinics.",
    logo: "/investments/adialante.png",
    logoWidth: 320,
    logoHeight: 319,
    logoClassName: "h-12 w-12 object-contain",
  },
  {
    name: "Dispatch",
    url: "https://dispatch.space/",
    description: "Reentry vehicles bringing cargo back from orbit.",
    logo: "/investments/dispatch.svg",
    logoWidth: 163,
    logoHeight: 163,
    logoClassName: "h-11 w-11 rounded-lg",
  },
];

export default function Investments() {
  return (
    <div className="mt-24 w-full text-center">
      <h2 className="text-2xl font-bold mb-4">Angel investments</h2>
      <p className="text-muted-foreground mb-8">
        A few early-stage companies I&apos;m lucky enough to back.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        {investments.map((investment) => (
          <Link
            key={investment.name}
            href={investment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <Card className="relative flex h-full flex-col items-center gap-3 p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <ArrowUpRight
                aria-hidden="true"
                className="absolute right-3 top-3 h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
              />
              <div className="flex h-14 items-center justify-center">
                <Image
                  src={investment.logo}
                  alt=""
                  width={investment.logoWidth}
                  height={investment.logoHeight}
                  className={investment.logoClassName}
                  unoptimized={investment.logo.endsWith(".svg")}
                />
              </div>
              <h3 className="font-semibold">{investment.name}</h3>
              <p className="text-sm text-muted-foreground">
                {investment.description}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
