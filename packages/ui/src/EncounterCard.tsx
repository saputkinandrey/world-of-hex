import { Box, Typography } from "@mui/material";

export type EncounterCardData = {
  _id: string;
  name: string;
  radius: number;
};

type EncounterCardProps = {
  encounter: EncounterCardData;
  onClick?: () => void;
};

export function EncounterCard({ encounter, onClick }: EncounterCardProps) {
  const isInteractive = Boolean(onClick);

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
    </Box>
  );
}
