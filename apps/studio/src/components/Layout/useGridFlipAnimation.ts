import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import {
  captureGridSnapshot,
  playFrameResizeAnimation,
  playGridFlipAnimation,
  SMOOTH_DURATION_MS,
  type GridFlipSnapshot,
} from './gridAnimation'

export function useGridFlipAnimation(): {
  gridRef: RefObject<HTMLDivElement | null>
  frameRef: RefObject<HTMLDivElement | null>
  captureSnapshot: () => void
  scheduleAnimation: (changedItemId?: string | 'all') => void
} {
  const gridRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const snapshotRef = useRef<GridFlipSnapshot>({ container: null, items: new Map() })
  const frameWidthRef = useRef(0)
  const contentFadeIdRef = useRef<string | 'all' | undefined>(undefined)
  const resetWidthTimer = useRef<number | undefined>(undefined)
  const [animTick, setAnimTick] = useState(0)
  const isFirstRender = useRef(true)

  const captureSnapshot = useCallback(() => {
    if (gridRef.current) {
      snapshotRef.current = captureGridSnapshot(gridRef.current)
    }
    if (frameRef.current) {
      frameWidthRef.current = frameRef.current.getBoundingClientRect().width
    }
  }, [])

  const scheduleAnimation = useCallback((changedItemId?: string | 'all') => {
    contentFadeIdRef.current = changedItemId
    setAnimTick((t) => t + 1)
  }, [])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const container = gridRef.current
    if (!container) return

    const frame = frameRef.current
    const fromFrameWidth = frameWidthRef.current

    playGridFlipAnimation(
      container,
      snapshotRef.current,
      contentFadeIdRef.current,
      () => {
        // Pin the grid to its final width and animate the frame around it, so
        // FLIP measures a stable final layout while the canvas resizes.
        if (!frame) return
        const finalWidth = frame.getBoundingClientRect().width
        if (Math.abs(finalWidth - fromFrameWidth) <= 0.5) return

        container.style.width = `${container.getBoundingClientRect().width}px`
        const animating = playFrameResizeAnimation(frame, fromFrameWidth)

        if (animating) {
          window.clearTimeout(resetWidthTimer.current)
          resetWidthTimer.current = window.setTimeout(() => {
            container.style.width = ''
          }, SMOOTH_DURATION_MS)
        } else {
          container.style.width = ''
        }
      },
    )
  }, [animTick])

  useEffect(() => () => window.clearTimeout(resetWidthTimer.current), [])

  return { gridRef, frameRef, captureSnapshot, scheduleAnimation }
}
