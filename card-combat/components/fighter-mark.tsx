interface FighterMarkProps {
    kind: string;
    color?: string;
    size?: number;
}
export default function FighterMark({
    kind,
    color = "currentColor",
    size = 60,
}: FighterMarkProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 80 80"
            fill="none"
            aria-hidden="true"
        >
            <circle cx="40" cy="16" r="8" fill={color} />
            <path
                d="M28 29L39 25L50 30L53 49L45 52L47 71H39L35 51L31 71H23L27 49L22 42Z"
                fill={color}
            />
            <path
                d={
                    kind === "roman_velites"
                        ? "M17 31Q5 35 8 49Q10 57 18 59Q26 52 27 40Z"
                        : "M15 30Q4 31 6 52Q8 61 17 64Q26 56 27 34Z"
                }
                fill={color}
                opacity=".6"
            />
            <path
                d="M53 30L60 43"
                stroke={color}
                strokeWidth="5"
                strokeLinecap="round"
            />
            {kind === "roman_triarii" ? (
                <>
                    <path d="M64 6V72" stroke={color} strokeWidth="3" />
                    <path d="M64 0L60 12H68Z" fill={color} />
                </>
            ) : kind === "roman_velites" ? (
                <path
                    d="M68 17L54 57M74 21L60 61"
                    stroke={color}
                    strokeWidth="2"
                />
            ) : (
                <path d="M58 38L72 22L73 36L62 47Z" fill={color} />
            )}
            <path d="M28 14Q36 1 48 10L52 17H28Z" fill={color} />
        </svg>
    );
}
