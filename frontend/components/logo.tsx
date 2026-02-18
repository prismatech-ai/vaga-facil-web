import Image from "next/image"

interface LogoProps {
  className?: string
  width?: number
  variant?: "default" | "white"
}

export function Logo({ className = "", width = 140, variant = "default" }: LogoProps) {
  // Usa uma altura proporcional para o Next.js Image, mas permite que o CSS mantenha a proporção
  // A proporção real será mantida pelo browser através de height: auto
  const estimatedHeight = Math.round(width * 0.3) // Ajuste conforme a proporção real da sua logo

  return (
    <div 
      className={`${className} inline-block`}
      style={{ width: `${width}px`, maxWidth: "100%" }}
    >
      <Image
        src="/placeholder-logo.png"
        alt="Vaga Facil"
        width={width}
        height={estimatedHeight}
        sizes={`${width}px`}
        style={{ 
          width: "100%", 
          height: "auto",
          objectFit: "contain",
          display: "block",
          filter: variant === "white" ? "brightness(0) invert(1)" : "none"
        }}
        priority
      />
    </div>
  )
}
