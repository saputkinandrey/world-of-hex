import { Box, Typography } from "@mui/material";

export type EncounterCardData = {
  _id: string;
  name: string;
  radius: number;
};

type EncounterCardProps = {
  encounter: EncounterCardData;
};

export function EncounterCard({ encounter }: EncounterCardProps) {
  return (
    <Box
      sx={{
        border: "1px solid var(--stroke, rgba(0,0,0,0.08))",
        borderRadius: 2,
        px: 2,
        py: 1,
        backgroundColor: "background.paper",
      }}
    >
      <Typography>{encounter.name}</Typography>
      <Typography variant="caption" color="text.secondary">
        {encounter._id} · radius {encounter.radius}
      </Typography>
    </Box>
  );
}
