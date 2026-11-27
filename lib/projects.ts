// View and star counts were taken from X and GitHub on Nov 27, 2026.

export type ProjectLink = {
  label: "X" | "GitHub" | "Play" | "Site" | "Demo"
  href: string
}

export type Project = {
  title: string
  description: string
  date: string
  image: string
  video?: string
  views?: number
  stars?: number
  links: ProjectLink[]
}

const x = (id: string): ProjectLink => ({
  label: "X",
  href: `https://x.com/rehan_shei/status/${id}`,
})
const gh = (repo: string): ProjectLink => ({
  label: "GitHub",
  href: `https://github.com/${repo}`,
})

export const projects: Project[] = [
  {
    title: "Infinite Interdimensional Cable",
    description:
      "MiniMax H3 Max makes video faster than you can watch it, so I streamed it nonstop with chat picking the scenes. Twitch and Kick both banned it within an hour.",
    date: "Aug 2026",
    image: "/projects/interdimensional-cable.jpg",
    // X removed this video after a copyright claim, so the launch clip is hosted here.
    video: "/projects/interdimensional-cable.mp4",
    views: 6198255,
    links: [x("2093528415576211819")],
  },
  {
    title: "universal-modder",
    description:
      "Skills and tools that let Claude Code mod almost any game you own: engine recon, decompiling, generated sprites, 3D and audio, and testing in the real game.",
    date: "Sep 2026",
    image: "/projects/universal-modder.jpg",
    views: 3858302,
    stars: 9917,
    links: [x("2105161487509852622"), gh("rehan-remade/universal-modder")],
  },
  {
    title: "Minecraft × GTA V",
    description:
      "Steve flying an elytra through Los Santos, taking on five-star police and opening a Nether portal. Built with universal-modder; the clips did 5.2M views.",
    date: "Sep 2026",
    image: "/projects/minecraft-gta.jpg",
    views: 2939834,
    links: [x("2105221417876984140")],
  },
  {
    title: "Terraria, reverse engineered overnight",
    description:
      "Pointed Opus 5.5 at Terraria before bed and woke up to a working reverse-engineered build. Then I added a homing missile launcher, a tactical nuke and new mobs.",
    date: "Sep 2026",
    image: "/projects/terraria.jpg",
    views: 1039834,
    links: [x("2104662849624981571")],
  },
  {
    title: "Patch",
    description:
      "Build and play games: every game dev tool in one CLI and MCP, 50,000+ open-source assets, and remix any game.",
    date: "Nov 2026",
    image: "/projects/patch.jpg",
    views: 547721,
    links: [x("2119855388988518794"), { label: "Site", href: "https://patch.gg/" }],
  },
  {
    title: "Manifold",
    description:
      "Streams a 3D model's intermediate diffusion steps, so its shape and textures fill in while it generates. Built on fal serverless.",
    date: "Jan 2026",
    image: "/projects/manifold.jpg",
    views: 440926,
    stars: 52,
    links: [
      x("2011584657645846726"),
      gh("rehan-remade/Manifold"),
      { label: "Demo", href: "https://manifold-jet.vercel.app/" },
    ],
  },
  {
    title: "pixelfx",
    description:
      "244 pixel art effects, each written, rendered and fixed in code by Opus 5.5, plus the skill to make your own.",
    date: "Oct 2026",
    image: "/projects/pixelfx.jpg",
    views: 118462,
    stars: 9636,
    links: [
      x("2116062680121540611"),
      gh("patch-gg/pixelfx"),
      { label: "Play", href: "https://patch.gg/patch/pixel-effects" },
    ],
  },
  {
    title: "anymove",
    description:
      "Motion capture for any creature from one AI video: two camera views, a fine-tuned DINOv2 to track joints, solved onto a real rig.",
    date: "Oct 2026",
    image: "/projects/anymove.jpg",
    views: 112612,
    stars: 671,
    links: [x("2115003471015588021"), gh("patch-gg/anymove")],
  },
  {
    title: "trompe",
    description:
      "Texture a whole game level from a gray blockout: image models paint 128 views of the map and the results are projected back on.",
    date: "Oct 2026",
    image: "/projects/trompe.jpg",
    views: 100652,
    stars: 231,
    links: [x("2114573844858159372"), gh("patch-gg/trompe")],
  },
  {
    title: "Microduck vs. dropkicks",
    description:
      "Trained the Microduck robot with RL to get back on its feet after I dropkick it.",
    date: "Aug 2026",
    image: "/projects/microduck.jpg",
    views: 86521,
    links: [x("2093628176517984659")],
  },
  {
    title: "Thanos in GTA V",
    description: "Thanos as a playable character in GTA V, Infinity Stones and all.",
    date: "Oct 2026",
    image: "/projects/thanos-gta.jpg",
    views: 85831,
    links: [x("2105868361037205743")],
  },
  {
    title: "Age of Empires II: the San Franciscans",
    description:
      "A new AoE II civ with Robotaxi cavalry that rams everything, Delivery Drones and the Transamerica Pyramid as its wonder.",
    date: "Sep 2026",
    image: "/projects/aoe2.jpg",
    views: 80353,
    links: [x("2105052988792557991")],
  },
  {
    title: "Moon landing in pixel art",
    description: "The Apollo moon landing rebuilt as sprite-stacked pixel art.",
    date: "Nov 2026",
    image: "/projects/moon-landing.jpg",
    views: 76625,
    links: [x("2123544693976035473")],
  },
  {
    title: "Voxel creatures from a sentence",
    description:
      "One sentence to a rigged, animated voxel creature: concept art, a 3D mesh, my C++ voxelizer, then auto-rigging in headless Blender.",
    date: "Sep 2026",
    image: "/projects/voxel-creatures.jpg",
    views: 48433,
    stars: 29,
    links: [x("2099856262720549343"), gh("rehan-remade/animated-asset-skill")],
  },
  {
    title: "AI video in VR",
    description:
      "Trained H3 Max LoRAs to make 360° VR video and watched it in my headset. A full VR video takes about 8 seconds.",
    date: "Sep 2026",
    image: "/projects/holodeck.jpg",
    views: 47363,
    links: [x("2095334085568692617")],
  },
  {
    title: "crowdbricks",
    description:
      "Batched NVIDIA MotionBricks: about 10k motion generations a second on one 4090, 26x faster, for huge dynamic crowds.",
    date: "Oct 2026",
    image: "/projects/crowdbricks.jpg",
    views: 44349,
    stars: 175,
    links: [x("2115191193890177086"), gh("patch-gg/crowdbricks")],
  },
  {
    title: "Blender skills for agents",
    description:
      "29 Blender skills for coding agents: modeling, rigging, hair, sims, lighting and export.",
    date: "Nov 2026",
    image: "/projects/blender-skills.jpg",
    views: 37315,
    stars: 11,
    links: [x("2123953444230963544"), gh("patch-gg/cloud-blender-skills")],
  },
  {
    title: "Hollow Crown",
    description:
      "A MapleStory-inspired pixel RPG made with the Unity CLI and Opus 5.5, which also played it and cut the trailer.",
    date: "Sep 2026",
    image: "/projects/hollow-crown.jpg",
    views: 32243,
    stars: 23,
    links: [
      x("2103755997533839416"),
      { label: "Play", href: "https://rehan-remade.github.io/hollow-crown/" },
      gh("rehan-remade/hollow-crown"),
    ],
  },
  {
    title: "Gojo in Cyberpunk 2077",
    description: "Gojo from Jujutsu Kaisen, playable in Cyberpunk 2077.",
    date: "Oct 2026",
    image: "/projects/gojo-cyberpunk.jpg",
    views: 29479,
    links: [x("2108795199988404610")],
  },
  {
    title: "Beating Pierre Gasly's pole",
    description:
      "Claude trained a PPO agent on an F1 game that beat Pierre Gasly's pole time by 2 seconds.",
    date: "Nov 2026",
    image: "/projects/f1-ppo.jpg",
    views: 29457,
    links: [x("2118976793311072277")],
  },
  {
    title: "LEGO by Opus 5.5",
    description:
      "Opus 5.5 designs LEGO builds and writes the step-by-step PDF instructions for them.",
    date: "Sep 2026",
    image: "/projects/lego.jpg",
    views: 27532,
    links: [x("2103225762795200825")],
  },
  {
    title: "CoD zombies in Minecraft",
    description:
      "World at War zombies rebuilt in Minecraft: the whole map, wall buys and the mystery box, all in block style.",
    date: "Oct 2026",
    image: "/projects/cod-zombies-minecraft.jpg",
    views: 24744,
    links: [x("2106977544876831205")],
  },
  {
    title: "Halo's Warthog in Minecraft",
    description:
      "Halo CE's Warthog in Minecraft, plus block-style Elites, Grunts and Jackals.",
    date: "Oct 2026",
    image: "/projects/halo-minecraft.jpg",
    views: 14825,
    links: [x("2106975140445892959")],
  },
  {
    title: "NVIDIA Kimodo on fal",
    description:
      "Type a sentence, get an animated 3D character: NVIDIA's text-to-motion model on fal serverless, retargeted onto any rig.",
    date: "Jul 2026",
    image: "/projects/nvidia-kimodo.jpg",
    views: 11281,
    stars: 36,
    links: [x("2074698199546441757"), gh("rehan-remade/nvidia-kimodo")],
  },
  {
    title: "Destiny-inspired FPS",
    description:
      "An FPS inspired by Destiny, built on Patch with Fable 5.2. It's open source, so anyone can remix it.",
    date: "Nov 2026",
    image: "/projects/destiny-fps.jpg",
    views: 7114,
    links: [x("2119994607291584962")],
  },
  {
    title: "open-annie",
    description:
      "A voice-driven 3D character in the browser: GPT-Live talks while Jev picks every face, gesture and dance in about 120 ms.",
    date: "Oct 2026",
    image: "/projects/open-annie.jpg",
    views: 3578,
    stars: 74,
    links: [x("2107776318532464702"), gh("rehan-remade/open-annie")],
  },
  {
    title: "Pixel splats",
    description:
      "Pixel-art Gaussian splat dioramas in the browser, plus the skill to make your own.",
    date: "Nov 2026",
    image: "/projects/pixel-splats.jpg",
    views: 1975,
    stars: 7,
    links: [
      x("2122160905161167289"),
      { label: "Play", href: "https://patch.gg/rehan/pixel-splats" },
      gh("patch-gg/pixel-splats"),
    ],
  },
  {
    title: "Spellyard",
    description:
      "A 3v3 wizard brawler on a floating island, built with Patch multiplayer and open source.",
    date: "Nov 2026",
    image: "/projects/spellyard.jpg",
    views: 1504,
    links: [
      x("2125019050413813835"),
      { label: "Play", href: "https://patch.gg/games/rehan/spellyard" },
    ],
  },
  {
    title: "banana-peel",
    description:
      "Reddit meets nano-banana: every comment is an image edit, and you chain them together.",
    date: "Sep 2025",
    image: "/projects/banana-peel.jpg",
    views: 149,
    links: [x("1965254645405864330"), { label: "Site", href: "https://banana-peel.com/" }],
  },
]

export type ViralPost = {
  text: string
  date: string
  views: number
  href: string
}

export const viralPosts: ViralPost[] = [
  {
    text: "Holy shit! Sports replays are going to be absolutely insane!",
    date: "Sep 2026",
    views: 2806618,
    href: "https://x.com/rehan_shei/status/2094955712606593294",
  },
  {
    text: "interactive media will be huge in the next year or two! this is incredible",
    date: "Sep 2026",
    views: 1274493,
    href: "https://x.com/rehan_shei/status/2102835377426034734",
  },
  {
    text: "what the helli is going on? this might be the metaverse? zuck was right",
    date: "Sep 2026",
    views: 240133,
    href: "https://x.com/rehan_shei/status/2105204938121072779",
  },
  {
    text: "I left @fal to start something new.",
    date: "Oct 2026",
    views: 128641,
    href: "https://x.com/rehan_shei/status/2109650540158484913",
  },
  {
    text: "personal update: i'm now an @a16z scout!",
    date: "Sep 2026",
    views: 115911,
    href: "https://x.com/rehan_shei/status/2098688615056392653",
  },
  {
    text: "How to make games with AI",
    date: "Nov 2026",
    views: 80397,
    href: "https://x.com/rehan_shei/status/2126111565321756993",
  },
]

export const totalXViews = 28_000_000
export const totalGithubStars = projects.reduce((sum, p) => sum + (p.stars ?? 0), 0)

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (n >= 10_000) return `${Math.round(n / 1_000)}K`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`
  return `${n}`
}
