import React, { useState } from 'react'

// Deterministic food-photo fallback used whenever a business's stored image
// cannot load (removed/unsplash 404/orb-blocked) so no broken-image icon is
// ever visible. Falls can be overridden per-card with the fallbackSrc prop.
export const FOOD_FALLBACK_IMG = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80'

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string
  fallbackSrc?: string
}

export function ImageWithFallback({ src, fallbackSrc = FOOD_FALLBACK_IMG, alt, style, className, ...rest }: Props) {
  const [didError, setDidError] = useState(false)

  const handleError = () => {
    setDidError(true)
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={didError ? fallbackSrc : (src || fallbackSrc)}
      alt={alt}
      className={className}
      style={style}
      {...rest}
      onError={handleError}
      data-fallback-active={didError ? 'true' : undefined}
    />
  )
}
