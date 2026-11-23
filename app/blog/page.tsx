import { Metadata } from "next"
import BlogCard from "@/components/blog-card"
import vaeImage from "@/public/vae_banner.jpg"
import doublePendulumBanner from "@/public/double-pendulum-banner.svg"
import goldenAgeImage from "@/public/golden-age-of-gaming.jpg"
import openSourceGamesImage from "@/public/all-games-open-source.jpg"

export const metadata: Metadata = {
  title: "Blog",
  description: "Posts about code, projects and various other things.",
}

export default function BlogPage() {
  const posts = [
    {
      title: "The golden age of gaming is back",
      date: "October 23, 2026",
      href: "https://x.com/rehan_shei/status/2113804793479369140",
      image: goldenAgeImage,
      imageClassName: "object-contain",
    },
    {
      title: "All games are open source now",
      date: "October 3, 2026",
      href: "https://x.com/rehan_shei/status/2106548006350942533",
      image: openSourceGamesImage,
      imageClassName: "object-contain",
    },
    {
      title: "My First Program Was Chaos",
      date: "July 7, 2026",
      href: "/blog/double-pendulum",
      image: doublePendulumBanner,
    },
    {
      title: "What the F*** is a VAE?",
      date: "January 23, 2025",
      href: "/blog/vae",
      image: vaeImage,
    },
  ]

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {posts.map((post) => (
          <BlogCard key={post.href} {...post} />
        ))}
      </div>
    </div>
  )
}
