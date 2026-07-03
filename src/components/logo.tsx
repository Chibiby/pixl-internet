import Image from "next/image";
import Link from "next/link";

/**
 * Header logo slot. Replace public/logo.png with the final PIXL asset —
 * any wide (~2:1) image will fit.
 */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <Link href="/" className="flex items-center gap-3 shrink-0">
      <Image
        src="/logo.png"
        alt="PIXL Internet Service"
        width={size * 1.8}
        height={size}
        className="rounded-md object-cover"
        style={{ height: size, width: "auto" }}
        priority
      />
      <span className="font-heading text-lg font-bold tracking-widest text-glow-cyan hidden sm:inline">
        PIXL
      </span>
    </Link>
  );
}
