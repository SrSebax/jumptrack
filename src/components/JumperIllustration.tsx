/** Figura saltando la cuerda, de fondo mientras la cámara arranca. */
export function JumperIllustration() {
  return (
    <svg className="jumper" viewBox="0 0 100 120" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="50" cy="17" r="10" />
        <path d="M50 27v40M50 67l-12 26M50 67l12 26M50 40l-18 12M50 40l18 12" />
      </g>
      <path
        d="M30 58c-6 18-2 34 8 38 6 3 18 3 24 0 10-4 14-20 8-38"
        fill="none"
        stroke="var(--lime)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="6 6"
      />
    </svg>
  )
}
