import { Box, Typography } from "@mui/material";

export type EncounterPlayer = {
  _id: string;
  name?: string | null;
};

export type EncounterCardData = {
  _id: string;
  name: string | null;
  radius: number;
  players?: EncounterPlayer[];
};

type EncounterCardProps = {
  encounter: EncounterCardData;
  onClick?: () => void;
  onRemovePlayer?: (playerId: string) => void;
};

export default function EncounterCard({
  encounter,
  onClick,
  onRemovePlayer,
}: EncounterCardProps) {
  const isInteractive = Boolean(onClick);
  const players =
    encounter.players?.filter((player) => player && player._id) ?? [];

  return (
    <Box
      sx={{
        border: "1px solid var(--stroke, rgba(0,0,0,0.08))",
        borderRadius: 2,
        px: 2,
        py: 1,
        backgroundColor: "background.paper",
        cursor: isInteractive ? "pointer" : "default",
        transition: "border-color 120ms ease, background-color 120ms ease",
        "&:hover": isInteractive
          ? {
              borderColor: "rgba(0,0,0,0.2)",
              backgroundColor: "rgba(0,0,0,0.02)",
            }
          : undefined,
      }}
      onClick={onClick}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={(event) => {
        if (!isInteractive) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }}
    >
      <Typography>{encounter.name ?? "Encounter"}</Typography>
      <Typography variant="caption" color="text.secondary">
        {encounter._id} - radius {encounter.radius}
      </Typography>
      {players.length > 0 ? (
        <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 1 }}>
          {players.map((player) => (
            <Box
              key={player._id}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                px: 1,
                py: 0.25,
                borderRadius: 999,
                border: "1px solid var(--stroke, rgba(0,0,0,0.08))",
                fontSize: 12,
                color: "text.secondary",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {player.name ?? player._id}
              </Typography>
              {onRemovePlayer ? (
                <Box
                  component="button"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemovePlayer(player._id);
                  }}
                  sx={{
                    border: "none",
                    background: "transparent",
                    color: "inherit",
                    cursor: "pointer",
                    fontSize: 12,
                    lineHeight: 1,
                    px: 0.5,
                    py: 0,
                    borderRadius: 999,
                    "&:hover": {
                      color: "text.primary",
                      backgroundColor: "rgba(0,0,0,0.06)",
                    },
                  }}
                  aria-label={`Remove ${player.name ?? player._id}`}
                >
                  x
                </Box>
              ) : null}
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
