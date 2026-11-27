import { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, Eye, Star } from "lucide-react"
import { Card } from "@/components/ui/card"
import {
  formatCount,
  projects,
  totalGithubStars,
  totalXViews,
  viralPosts,
  type Project,
} from "@/lib/projects"

export const metadata: Metadata = {
  title: "Projects",
  description: "Things I've built, mostly shared on X.",
}

function ProjectCard({ project }: { project: Project }) {
  const primary = project.links[0]

  return (
    <Card className="flex flex-col overflow-hidden">
      {project.video ? (
        <video
          src={project.video}
          poster={project.image}
          controls
          playsInline
          preload="none"
          aria-label={project.title}
          className="aspect-video w-full bg-black object-cover"
        />
      ) : (
        <Link
          href={primary.href}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block aspect-video bg-muted"
        >
          <Image
            src={project.image}
            alt={project.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-opacity hover:opacity-90"
          />
        </Link>
      )}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h2 className="font-semibold leading-snug">{project.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{project.date}</span>
            {project.views !== undefined && (
              <span className="flex items-center gap-1">
                <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                {formatCount(project.views)} views
              </span>
            )}
            {project.stars !== undefined && (
              <span className="flex items-center gap-1">
                <Star aria-hidden="true" className="h-3.5 w-3.5" />
                {formatCount(project.stars)} stars
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{project.description}</p>
        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm font-medium">
          {project.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 hover:underline"
            >
              {link.label}
              <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          ))}
        </div>
      </div>
    </Card>
  )
}

export default function ProjectsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-24">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold">Projects</h1>
        <p className="mt-4 text-muted-foreground">
          Things I&apos;ve built, mostly shared on{" "}
          <Link
            href="https://x.com/rehan_shei"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            X
          </Link>
          .
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {formatCount(totalXViews)}+ views on X · {formatCount(totalGithubStars)}+ GitHub
          stars
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
      </div>

      <section className="mx-auto mt-24 max-w-3xl">
        <h2 className="mb-6 text-center text-2xl font-bold">More posts that took off</h2>
        <ul className="divide-y rounded-xl border">
          {viralPosts.map((post) => (
            <li key={post.href}>
              <Link
                href={post.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
              >
                <span className="flex-1 text-sm">{post.text}</span>
                <span className="shrink-0 text-right text-xs text-muted-foreground">
                  <span className="block font-medium text-foreground">
                    {formatCount(post.views)} views
                  </span>
                  {post.date}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
