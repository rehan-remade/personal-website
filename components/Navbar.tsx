"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navigation = [
  { name: "Home", href: "/" },
  { name: "Blog", href: "/blog" },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <nav className="bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 px-6 py-2 rounded-full border border-gray-200 dark:border-gray-800">
        <ul className="flex items-center gap-6">
          {navigation.map((item) => (
            <li key={item.name}>
              <Link 
                href={item.href}
                className={cn(
                  "text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white transition-colors",
                  pathname === item.href ? "text-foreground" : "text-foreground/60"
                )}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
} 