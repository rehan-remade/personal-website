import { Metadata } from "next"
import BlogCard from "@/components/blog-card"
import vaeImage from "@/public/vae_banner.jpg"

export const metadata: Metadata = {
  title: "Blog",
  description: "Posts about code, projects and various other things.",
}

export default function BlogPage() {
  const posts = [
    {
      title: "What the F*** is a VAE?",
      date: "January 23, 2025",
      slug: "vae",
      image: vaeImage,
    },
  ]

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {posts.map((post) => (
          <BlogCard key={post.slug} {...post} />
        ))}
      </div>
    </div>
  )
}