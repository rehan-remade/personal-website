import { Card, CardHeader } from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"
import { StaticImageData } from "next/image"
import { ArrowUpRight } from "lucide-react"

interface BlogCardProps {
  title: string
  date: string
  href: string
  image: StaticImageData | string
  imageClassName?: string
}

export default function BlogCard({
  title,
  date,
  href,
  image,
  imageClassName = "object-cover",
}: BlogCardProps) {
  const external = href.startsWith("http")

  return (
    <Link
      href={href}
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative h-48 w-full">
          <Image
            src={image}
            alt={title}
            fill
            className={imageClassName}
          />
        </div>
        <CardHeader>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            {date}
            {external && (
              <>
                <span aria-hidden="true">·</span> on X
                <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
              </>
            )}
          </p>
        </CardHeader>
      </Card>
    </Link>
  )
}
