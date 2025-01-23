import { Card, CardHeader } from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"
import { StaticImageData } from "next/image"

interface BlogCardProps {
  title: string
  date: string
  slug: string
  image: StaticImageData | string
}

export default function BlogCard({ title, date, slug, image }: BlogCardProps) {
  return (
    <Link href={`/blog/${slug}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative h-48 w-full">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover"
          />
        </div>
        <CardHeader>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{date}</p>
        </CardHeader>
      </Card>
    </Link>
  )
} 