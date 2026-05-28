export function Avatar({ name, image, size = 28 }: { name: string; image?: string | null; size?: number }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={name} width={size} height={size} className="rounded-full object-cover bg-gray-200 shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="rounded-full bg-gray-300 text-gray-700 flex items-center justify-center font-medium shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {initial}
    </span>
  );
}
