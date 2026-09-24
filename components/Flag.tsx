import type { FlagSpec } from "@/lib/game";
export default function Flag({
  spec,
  iso,
  original = false,
  large = false,
}: {
  spec: FlagSpec;
  iso?: string;
  original?: boolean;
  large?: boolean;
}) {
  if (original && iso && iso !== "-99")
    return (
      <span
        aria-label={`${iso} flag`}
        role="img"
        className={`nation-flag fi fi-${iso.toLowerCase()} ${large ? "large" : ""}`}
      />
    );
  const [a, b, c = b] = spec.colors;
  return (
    <svg
      role="img"
      aria-label="Custom national flag"
      viewBox="0 0 90 60"
      className={`nation-flag ${large ? "large" : ""}`}
    >
      <rect width="90" height="60" fill={a} />
      {spec.layout === "horizontal" && (
        <>
          <rect y="20" width="90" height="20" fill={b} />
          <rect y="40" width="90" height="20" fill={c} />
        </>
      )}
      {spec.layout === "vertical" && (
        <>
          <rect x="30" width="30" height="60" fill={b} />
          <rect x="60" width="30" height="60" fill={c} />
        </>
      )}
      {spec.layout === "cross" && (
        <>
          <rect x="27" width="12" height="60" fill={b} />
          <rect y="24" width="90" height="12" fill={b} />
        </>
      )}
      {spec.layout === "diagonal" && <path d="M0 60 L90 0 L90 60Z" fill={b} />}
      {spec.layout === "canton" && (
        <>
          <rect y="30" width="90" height="30" fill={b} />
          <rect width="40" height="30" fill={c} />
        </>
      )}
      {spec.emblem === "star" && (
        <path
          d="M45 14 49 25 61 25 51 32 55 44 45 37 35 44 39 32 29 25 41 25Z"
          fill={c}
          stroke={a}
          strokeWidth="1"
        />
      )}
      {spec.emblem === "sun" && (
        <g stroke={c} strokeWidth="2">
          <circle cx="45" cy="30" r="8" fill={c} />
          {Array.from({ length: 12 }, (_, i) => (
            <path
              key={i}
              d="M45 16 V12"
              transform={`rotate(${i * 30} 45 30)`}
            />
          ))}
        </g>
      )}
      {spec.emblem === "diamond" && (
        <path d="M45 14 60 30 45 46 30 30Z" fill={c} stroke={a} />
      )}
      {spec.emblem === "wreath" && (
        <>
          <path
            d="M34 19 Q19 40 45 46 Q71 40 56 19"
            fill="none"
            stroke={c}
            strokeWidth="5"
          />
          <circle cx="45" cy="29" r="5" fill={c} />
        </>
      )}
    </svg>
  );
}
