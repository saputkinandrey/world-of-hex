"use client";

import {
    AppBar,
    Box,
    Button,
    Chip,
    Container,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Toolbar,
    Typography,
} from "@mui/material";
import CalculateRoundedIcon from "@mui/icons-material/CalculateRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import {
    type EconomyAdminTab,
    characterNavigationOptions,
    economyNavigationOptions,
    foodNavigationOptions,
    EconomyAdminProvider,
    useEconomyAdmin,
} from "../context/EconomyAdminContext";
import { BehaviorActionsScreen } from "./screens/BehaviorActionsScreen";
import { BiomesScreen } from "./screens/BiomesScreen";
import { ConfigScreen } from "./screens/ConfigScreen";
import { ConsumersScreen } from "./screens/ConsumersScreen";
import { CreatureSpeciesScreen } from "./screens/CreatureSpeciesScreen";
import { FoodScreen } from "./screens/FoodScreen";
import { GoodsScreen } from "./screens/GoodsScreen";
import { ProductionScreen } from "./screens/ProductionScreen";
import { RationScreen } from "./screens/RationScreen";
import { SkillsScreen } from "./screens/SkillsScreen";
import { TechniquesScreen } from "./screens/TechniquesScreen";
import { WorldTraitsScreen } from "./screens/WorldTraitsScreen";

const EconomyAdminContent = () => {
    const {
        tab,
        setTab,
        foodNavigationValue,
        economyNavigationValue,
        characterNavigationValue,
    } = useEconomyAdmin();

    return (
        <Box className="admin-shell">
            <AppBar
                position="sticky"
                elevation={0}
                sx={{
                    bgcolor: "rgba(7, 24, 21, 0.92)",
                    borderBottom: "1px solid var(--line)",
                }}
            >
                <Toolbar sx={{ gap: 2, minHeight: 64 }}>
                    <CalculateRoundedIcon color="primary" />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="h6" noWrap>
                            ECONOMY_ADMIN
                        </Typography>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            component="div"
                        >
                            Data-driven economy administration tool
                        </Typography>
                    </Box>
                    <Chip label="JSON config" size="small" variant="outlined" />
                </Toolbar>
            </AppBar>

            <Container maxWidth="xl" sx={{ py: 3 }}>
                <Stack spacing={3}>
                    <Paper className="source-panel" sx={{ p: 2 }}>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                            alignItems={{ xs: "stretch", sm: "center" }}
                        >
                            <FormControl
                                size="small"
                                sx={{ minWidth: { xs: "100%", sm: 220 } }}
                            >
                                <InputLabel>Food & Consumers</InputLabel>
                                <Select
                                    label="Food & Consumers"
                                    value={foodNavigationValue}
                                    displayEmpty
                                    onChange={(event) =>
                                        setTab(
                                            event.target
                                                .value as EconomyAdminTab,
                                        )
                                    }
                                >
                                    <MenuItem value="" disabled>
                                        Food & Consumers
                                    </MenuItem>
                                    {foodNavigationOptions.map((option) => (
                                        <MenuItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl
                                size="small"
                                sx={{ minWidth: { xs: "100%", sm: 240 } }}
                            >
                                <InputLabel>Economy Data</InputLabel>
                                <Select
                                    label="Economy Data"
                                    value={economyNavigationValue}
                                    displayEmpty
                                    onChange={(event) =>
                                        setTab(
                                            event.target
                                                .value as EconomyAdminTab,
                                        )
                                    }
                                >
                                    <MenuItem value="" disabled>
                                        Economy Data
                                    </MenuItem>
                                    {economyNavigationOptions.map((option) => (
                                        <MenuItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl
                                size="small"
                                sx={{ minWidth: { xs: "100%", sm: 180 } }}
                            >
                                <InputLabel>Characters</InputLabel>
                                <Select
                                    label="Characters"
                                    value={characterNavigationValue}
                                    displayEmpty
                                    onChange={(event) =>
                                        setTab(
                                            event.target
                                                .value as EconomyAdminTab,
                                        )
                                    }
                                >
                                    <MenuItem value="" disabled>
                                        Characters
                                    </MenuItem>
                                    {characterNavigationOptions.map(
                                        (option) => (
                                            <MenuItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </MenuItem>
                                        ),
                                    )}
                                </Select>
                            </FormControl>
                            <Button
                                variant={
                                    tab === "config" ? "contained" : "outlined"
                                }
                                startIcon={<ContentCopyRoundedIcon />}
                                onClick={() => setTab("config")}
                                sx={{
                                    alignSelf: { xs: "stretch", sm: "center" },
                                }}
                            >
                                JSON
                            </Button>
                        </Stack>
                    </Paper>

                    {tab === "ration" ? <RationScreen /> : null}
                    {tab === "food" ? <FoodScreen /> : null}
                    {tab === "goods" ? <GoodsScreen /> : null}
                    {tab === "production" ? <ProductionScreen /> : null}
                    {tab === "biomes" ? <BiomesScreen /> : null}
                    {tab === "population" ? <ConsumersScreen /> : null}
                    {tab === "skills" ? <SkillsScreen /> : null}
                    {tab === "techniques" ? <TechniquesScreen /> : null}
                    {tab === "creature-species" ? (
                        <CreatureSpeciesScreen />
                    ) : null}
                    {tab === "behavior-actions" ? (
                        <BehaviorActionsScreen />
                    ) : null}
                    {tab === "world-traits" ? <WorldTraitsScreen /> : null}
                    {tab === "config" ? <ConfigScreen /> : null}
                </Stack>
            </Container>
        </Box>
    );
};

export const EconomyAdminApp = () => {
    return (
        <EconomyAdminProvider>
            <EconomyAdminContent />
        </EconomyAdminProvider>
    );
};
