'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';

type Encounter = {
  _id: string;
  name: string;
  radius: number;
};

type Player = {
  _id: string;
  name: string;
};

type Ship = {
  _id: string;
  name: string;
  type: string;
  speed: number;
};

const shipTypes = ['drakkar', 'galleon', 'steamship', 'trireme'];

export default function HomePage() {
  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000/api',
    [],
  );

  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [ships, setShips] = useState<Ship[]>([]);
  const [loading, setLoading] = useState(false);

  const [encounterName, setEncounterName] = useState('');
  const [encounterRadius, setEncounterRadius] = useState(6);
  const [playerName, setPlayerName] = useState('');
  const [shipName, setShipName] = useState('');
  const [shipType, setShipType] = useState(shipTypes[0]);
  const [ownPlayerId, setOwnPlayerId] = useState('');
  const [ownShipId, setOwnShipId] = useState('');

  const fetchJson = async <T,>(
    path: string,
    options?: RequestInit,
  ): Promise<T> => {
    const res = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const message = await res.text();
      throw new Error(message || res.statusText);
    }
    return (await res.json()) as T;
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [encountersData, playersData, shipsData] = await Promise.all([
        fetchJson<Encounter[]>('/sea-combat/encounters/list'),
        fetchJson<Player[]>('/sea-combat/players/list'),
        fetchJson<Ship[]>('/sea-combat/ships/list'),
      ]);
      setEncounters(encountersData);
      setPlayers(playersData);
      setShips(shipsData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const createEncounter = async () => {
    await fetchJson('/sea-combat/encounters', {
      method: 'POST',
      body: JSON.stringify({
        name: encounterName.trim(),
        radius: Number(encounterRadius),
      }),
    });
    setEncounterName('');
    await loadAll();
  };

  const createPlayer = async () => {
    await fetchJson('/sea-combat/players', {
      method: 'POST',
      body: JSON.stringify({
        name: playerName.trim(),
      }),
    });
    setPlayerName('');
    await loadAll();
  };

  const createShip = async () => {
    await fetchJson('/sea-combat/ships', {
      method: 'POST',
      body: JSON.stringify({
        name: shipName.trim(),
        type: shipType,
      }),
    });
    setShipName('');
    await loadAll();
  };

  const assignShip = async () => {
    await fetchJson(`/sea-combat/players/${ownPlayerId}/own-a-ship`, {
      method: 'POST',
      body: JSON.stringify({
        shipId: ownShipId,
      }),
    });
    setOwnPlayerId('');
    setOwnShipId('');
    await loadAll();
  };

  return (
    <Box>
      <AppBar position="sticky" color="transparent" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            World of Hex · Control Deck
          </Typography>
          <Chip
            label={loading ? 'Syncing...' : 'Live'}
            color={loading ? 'warning' : 'success'}
            size="small"
            variant="outlined"
          />
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="outlined" onClick={loadAll}>
            Refresh
          </Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 6 }}>
        <Stack spacing={4}>
          <Box className="fade-in">
            <Typography variant="h3" gutterBottom>
              Sea-combat state
            </Typography>
            <Typography color="text.secondary">
              Manage encounters, players, and ships from one place.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} lg={4}>
              <Card className="glass fade-in">
                <CardContent>
                  <Typography variant="h5">Encounters</Typography>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    Create and browse encounters.
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      label="Name"
                      value={encounterName}
                      onChange={(event) =>
                        setEncounterName(event.target.value)
                      }
                    />
                    <TextField
                      label="Radius"
                      type="number"
                      value={encounterRadius}
                      onChange={(event) =>
                        setEncounterRadius(Number(event.target.value))
                      }
                    />
                    <Button
                      variant="contained"
                      onClick={createEncounter}
                      disabled={!encounterName.trim()}
                    >
                      Create encounter
                    </Button>
                    <Divider />
                    <Stack spacing={1}>
                      {encounters.map((enc) => (
                        <Box
                          key={enc._id}
                          sx={{
                            border: '1px solid var(--stroke)',
                            borderRadius: 2,
                            px: 2,
                            py: 1,
                          }}
                        >
                          <Typography>{enc.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {enc._id} · radius {enc.radius}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Card className="glass fade-in">
                <CardContent>
                  <Typography variant="h5">Players</Typography>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    Create players and assign ships.
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      label="Player name"
                      value={playerName}
                      onChange={(event) => setPlayerName(event.target.value)}
                    />
                    <Button
                      variant="contained"
                      onClick={createPlayer}
                      disabled={!playerName.trim()}
                    >
                      Create player
                    </Button>
                    <Divider />
                    <TextField
                      label="Assign player"
                      select
                      value={ownPlayerId}
                      onChange={(event) => setOwnPlayerId(event.target.value)}
                    >
                      {players.map((player) => (
                        <MenuItem key={player._id} value={player._id}>
                          {player.name} · {player._id}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Assign ship"
                      select
                      value={ownShipId}
                      onChange={(event) => setOwnShipId(event.target.value)}
                    >
                      {ships.map((ship) => (
                        <MenuItem key={ship._id} value={ship._id}>
                          {ship.name} · {ship.type}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Button
                      variant="outlined"
                      onClick={assignShip}
                      disabled={!ownPlayerId || !ownShipId}
                    >
                      Own a ship
                    </Button>
                    <Divider />
                    <Stack spacing={1}>
                      {players.map((player) => (
                        <Box
                          key={player._id}
                          sx={{
                            border: '1px solid var(--stroke)',
                            borderRadius: 2,
                            px: 2,
                            py: 1,
                          }}
                        >
                          <Typography>{player.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {player._id}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Card className="glass fade-in">
                <CardContent>
                  <Typography variant="h5">Ships</Typography>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    Create ships for sea combat.
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      label="Ship name"
                      value={shipName}
                      onChange={(event) => setShipName(event.target.value)}
                    />
                    <TextField
                      select
                      label="Ship type"
                      value={shipType}
                      onChange={(event) => setShipType(event.target.value)}
                    >
                      {shipTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Button
                      variant="contained"
                      onClick={createShip}
                      disabled={!shipName.trim()}
                    >
                      Create ship
                    </Button>
                    <Divider />
                    <Stack spacing={1}>
                      {ships.map((ship) => (
                        <Box
                          key={ship._id}
                          sx={{
                            border: '1px solid var(--stroke)',
                            borderRadius: 2,
                            px: 2,
                            py: 1,
                          }}
                        >
                          <Typography>{ship.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {ship._id} · {ship.type} · speed {ship.speed}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}
