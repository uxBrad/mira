/**
 * Window has no native title bar (titleBarStyle: 'hidden', see electron/main.ts).
 * AppShell defines its own 40px drag region with carefully zoned no-drag buttons.
 * Pages rendered outside AppShell (auth screens, loading states) need this instead —
 * height matches the native titleBarOverlay so the whole button-row band is draggable.
 */
export default function TitlebarDrag(): JSX.Element {
  return (
    <div
      className="titlebar-drag"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '40px', zIndex: 40 }}
    />
  )
}
