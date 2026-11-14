/* A real screenshot of an application at its base case, in the theme the visitor is using. Both images are
   in the markup; CSS hides the one for the other theme, and lazy loading means only the visible one loads. */
export function Preview({ slug, title, className = '', eager = false, sizes = '(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw' }: { slug: string; title: string; className?: string; eager?: boolean; sizes?: string }) {
  const alt = `Screenshot of the ${title} application at its base case`;
  const common = { width: 1200, height: 750, alt, sizes, decoding: 'async' as const, loading: eager ? 'eager' as const : 'lazy' as const, className: `block h-full w-full object-cover object-top ${className}` };
  return (
    <>
      <img {...common} src={`/assets/previews/${slug}-dark.webp`} className={`pv-dark ${common.className}`} />
      <img {...common} src={`/assets/previews/${slug}-light.webp`} className={`pv-light ${common.className}`} />
    </>
  );
}
