function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export default function Avatar({
  name,
  picture,
  size = 40,
}: {
  name?: string;
  picture?: string;
  size?: number;
}) {
  const style = { width: size, height: size };
  if (picture) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatar URLs come from user records and are arbitrary, not from next/image's configured optimizer domains
      <img
        src={picture}
        alt={name || "avatar"}
        style={style}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <div
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
    >
      {initials(name)}
    </div>
  );
}
