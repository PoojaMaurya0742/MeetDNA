import { HelixLines } from './dna-visuals'

const noise =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E"

export function SceneBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      {/* base */}
      <div className="absolute inset-0 bg-background" />

      {/* drifting orbs */}
      <div
        className="orb-a absolute -left-40 top-1/4 size-[42rem] rounded-full blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(0,255,136,0.10), transparent 70%)' }}
      />
      <div
        className="orb-b absolute -right-40 bottom-0 size-[40rem] rounded-full blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(74,158,255,0.10), transparent 70%)' }}
      />

      {/* DNA helix watermark */}
      <div className="absolute -right-10 top-0 h-[140%] w-72 opacity-[0.04]">
        <HelixLines className="helix-drift h-full w-full text-foreground" />
      </div>

      {/* noise overlay */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{ backgroundImage: `url("${noise}")` }}
      />
    </div>
  )
}
