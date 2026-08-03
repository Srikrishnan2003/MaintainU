import { CheckCircle2, Clock } from "lucide-react"

export function WaitingStep() {
  return (
    <div className="space-y-6 text-center animate-in fade-in duration-300 py-10">
      <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto ring-8 ring-orange-50 dark:ring-orange-950/20 shadow-lg">
        <Clock className="w-12 h-12 text-orange-600 dark:text-orange-400 animate-pulse" />
      </div>
      <div className="space-y-3">
        <h2 className="text-2xl font-black tracking-tight">Reviewing Profile</h2>
        <p className="text-muted-foreground text-sm leading-relaxed px-6">
          All details submitted! Our administrative team is currently reviewing your profile.
          <br /><span className="text-[10px] mt-2 block opacity-70">This screen will update automatically.</span>
        </p>
      </div>
      <div className="flex gap-2 items-center justify-center text-xs text-muted-foreground pt-4">
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" />
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:0.2s]" />
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:0.4s]" />
      </div>
    </div>
  )
}

export function ApprovedStep({ otpDigits }: { otpDigits: string[] }) {
  return (
    <div className="space-y-6 text-center animate-in fade-in duration-300 py-10">
      <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto ring-8 ring-green-50 dark:ring-green-950/20 shadow-lg">
        <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
      </div>
      <div className="space-y-3">
        <h2 className="text-2xl font-bold">Approved!</h2>
        <p className="text-muted-foreground text-sm">Automating your login access...</p>
      </div>
      <div className="flex justify-center gap-3 my-8">
        {otpDigits.map((digit, i) => (
          <div key={i} className={`w-12 h-16 rounded-2xl border flex items-center justify-center text-3xl font-bold transition-all ${digit ? "border-green-500 bg-green-500/10 text-green-600 shadow-md" : "border-border bg-background"}`}>
            <span className="animate-in zoom-in duration-300">{digit}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
