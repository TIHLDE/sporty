import { cn } from "@sporty/ui/lib/utils"
import { motion } from "framer-motion"

//  ------------------------------ | SPINNER - WAVE HELIX | ------------------------------  //

export default function SpinnerWaveHelix({
  className,
}: {
  className?: string
}) {
  const bars = [0, 1, 2, 3, 4, 5]

  return (
    <div
      className={cn("flex h-8 items-center gap-1.5", className)}
      role="status"
      aria-label="Loading"
    >
      {bars.map((i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-primary"
          animate={{
            height: ["8px", "28px", "8px"],
            opacity: [0.35, 1, 0.35],
          }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.14,
          }}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  )
}
