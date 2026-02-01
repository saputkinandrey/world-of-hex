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
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LinkOffRoundedIcon from '@mui/icons-material/LinkOffRounded';

type Encounter = {
  _id: string;
  name: string;
  radius: number;
};

type Player = {
  _id: string;
  name: string;
  ownedShips?: Array<{ _id: string }>;
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

  const shipNameById = useMemo(() => {
    const map = new Map<string, Ship>();
    ships.forEach((ship) => map.set(ship._id, ship));
    return map;
  }, [ships]);

  const shipOwnerById = useMemo(() => {
    const map = new Map<string, Player>();
    players.forEach((player) => {
      player.ownedShips?.forEach((owned) => {
        if (!map.has(owned._id)) {
          map.set(owned._id, player);
        }
      });
    });
    return map;
  }, [players]);

  const availableShips = useMemo(() => {
    const ownedIds = new Set<string>();
    players.forEach((player) => {
      player.ownedShips?.forEach((owned) => ownedIds.add(owned._id));
    });
    return ships.filter((ship) => !ownedIds.has(ship._id));
  }, [ships, players]);

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
    const text = await res.text();
    if (!res.ok) {
      throw new Error(text || res.statusText);
    }
    if (!text) {
      return null as T;
    }
    return JSON.parse(text) as T;
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

  const deleteShip = async (shipId: string) => {
    if (!window.confirm('Delete this ship?')) {
      return;
    }
    await fetchJson(`/sea-combat/ships/${shipId}`, {
      method: 'DELETE',
    });
    await loadAll();
  };

  const deletePlayer = async (playerId: string) => {
    if (!window.confirm('Delete this player?')) {
      return;
    }
    await fetchJson(`/sea-combat/players/${playerId}`, {
      method: 'DELETE',
    });
    await loadAll();
  };

  const unassignShip = async (playerId: string, shipId: string) => {
    await fetchJson(`/sea-combat/players/${playerId}/own-a-ship/${shipId}`, {
      method: 'DELETE',
    });
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
                      disabled={!ownPlayerId}
                      onChange={(event) => setOwnShipId(event.target.value)}
                    >
                      {availableShips.map((ship) => (
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
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography>{player.name}</Typography>
                            <IconButton
                              size="small"
                              aria-label="delete player"
                              onClick={() => deletePlayer(player._id)}
                              sx={{
                                border: '1px solid rgba(255, 77, 77, 0.6)',
                                color: 'rgba(255, 77, 77, 0.9)',
                                transform: 'rotate(-12deg)',
                                '&:hover': {
                                  borderColor: 'rgba(255, 77, 77, 0.9)',
                                  backgroundColor: 'rgba(255, 77, 77, 0.08)',
                                },
                              }}
                            >
                              <CloseRoundedIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {player._id}
                          </Typography>
                          {player.ownedShips?.length ? (
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                              {player.ownedShips.map((owned) => {
                                const ship = shipNameById.get(owned._id);
                                return (
                                  <Chip
                                    key={`${player._id}-${owned._id}`}
                                    label={ship ? ship.name : owned._id}
                                    size="medium"
                                    variant="outlined"
                                    onDelete={() =>
                                      unassignShip(player._id, owned._id)
                                    }
                                    deleteIcon={<LinkOffRoundedIcon />}
                                    sx={{
                                      height: 32,
                                      '& .MuiChip-deleteIcon': {
                                        color: '#ffb04d',
                                      },
                                      '& .MuiChip-deleteIcon:hover': {
                                        color: '#ffc06d',
                                      },
                                    }}
                                  />
                                );
                              })}
                            </Stack>
                          ) : (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block', mt: 1 }}
                            >
                              No ships assigned
                            </Typography>
                          )}
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
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography>{ship.name}</Typography>
                            <IconButton
                              size="small"
                              aria-label="delete ship"
                              onClick={() => deleteShip(ship._id)}
                              sx={{
                                border: '1px solid rgba(255, 77, 77, 0.6)',
                                color: 'rgba(255, 77, 77, 0.9)',
                                transform: 'rotate(-12deg)',
                                '&:hover': {
                                  borderColor: 'rgba(255, 77, 77, 0.9)',
                                  backgroundColor: 'rgba(255, 77, 77, 0.08)',
                                },
                              }}
                            >
                              <CloseRoundedIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {ship._id} · {ship.type} · speed {ship.speed}
                          </Typography>
                          {shipOwnerById.has(ship._id) ? (
                            <Chip
                              size="medium"
                              variant="outlined"
                              sx={{ mt: 1, height: 32 }}
                              label={`Owner: ${shipOwnerById.get(ship._id)?.name ?? 'unknown'}`}
                              onDelete={() => {
                                const owner = shipOwnerById.get(ship._id);
                                if (owner) {
                                  void unassignShip(owner._id, ship._id);
                                }
                              }}
                              deleteIcon={<LinkOffRoundedIcon />}
                              sx={{
                                mt: 1,
                                height: 32,
                                '& .MuiChip-deleteIcon': {
                                  color: '#ffb04d',
                                },
                                '& .MuiChip-deleteIcon:hover': {
                                  color: '#ffc06d',
                                },
                              }}
                            />
                          ) : (
                            <Chip
                              size="medium"
                              variant="outlined"
                              sx={{ mt: 1, height: 32 }}
                              label="Owner: —"
                            />
                          )}
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

