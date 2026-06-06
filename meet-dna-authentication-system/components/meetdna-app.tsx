'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SceneBackground } from './scene-background'
import { BrandingPanel } from './branding-panel'
import { ChoiceView } from './views/choice-view'
import { SignInView } from './views/sign-in-view'
import { SignUpView } from './views/sign-up-view'
import { JoinHostView } from './views/join-host-view'
import { DnaLogo } from './dna-visuals'

export type View = 'choice' | 'signin' | 'signup' | 'join'

export function MeetDnaApp() {
  const [view, setView] = useState<View>('choice')
  const router = useRouter()

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden">
      <SceneBackground />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1400px] flex-col lg:flex-row">
        {/* mobile logo strip */}
        <div className="flex items-center justify-between px-5 py-4 lg:hidden">
          <div className="flex items-center gap-2">
            <DnaLogo className="size-6" />
            <span className="font-display text-2xl tracking-wide text-foreground">MeetDNA</span>
          </div>
          <span className="text-xs text-muted">Meeting Intelligence</span>
        </div>

        {/* left branding panel */}
        <div className="hidden p-10 lg:block lg:w-[40%] xl:w-[42%]">
          <div className="sticky top-10 h-[calc(100vh-5rem)]">
            <BrandingPanel />
          </div>
        </div>

        {/* right auth panel */}
        <div className="slim-scroll flex flex-1 items-center justify-center px-5 pb-12 pt-2 lg:px-12 lg:pt-10">
          <div key={view} className="animate-view-in flex w-full justify-center">
            {view === 'choice' && <ChoiceView onSelect={setView} />}
            {view === 'signin' && (
              <SignInView
                onBack={() => setView('choice')}
                onNavigate={setView}
                onAuthed={() => router.push('/dashboard')}
              />
            )}
            {view === 'signup' && (
              <SignUpView
                onBack={() => setView('choice')}
                onNavigate={setView}
                onAuthed={() => router.push('/dashboard')}
              />
            )}
            {view === 'join' && (
              <JoinHostView
                onBack={() => setView('choice')}
                onJoin={(code) => router.push(`/meeting/${code}`)}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
