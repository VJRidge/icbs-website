import { DEVICE_WIDTH } from '../studio/lib/blog/blockStyle'

/** Editor canvas width for Tablet/Phone. Live pages use the matching CSS breakpoint instead. */
export function previewScreen(frameWidth: number): 'phone' | 'tablet' | 'desktop' {
  if (frameWidth <= DEVICE_WIDTH.mobile) return 'phone'
  if (frameWidth <= DEVICE_WIDTH.tablet) return 'tablet'
  return 'desktop'
}
