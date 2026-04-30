interface LogoProps {
  src: string
  alt: string
  href: string
  className?: string
}

export const Logo = ({ src, alt, href, className = '' }: LogoProps) => {
  return (
    <a href={href} target='_blank' rel='noopener noreferrer'>
      <img src={src} className={`logo ${className}`} alt={alt} />
    </a>
  )
}
