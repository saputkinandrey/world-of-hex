'use client';

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';
import { Metric } from '../common/Metric';
import { NumberField } from '../common/NumberField';
import { Panel } from '../common/Panel';
import { ProductionGoodList } from '../common/ProductionGoodList';
import { TextFieldEditor } from '../common/TextFieldEditor';
import { useDomainAdmin } from '../../context/DomainAdminContext';
import { formatGoodLevel, formatNumber, getGood, getGoodLevelName, getGoodProfile, removeArrayItem, updateArrayItem } from '../../lib/domain-admin-utils';

export const BiomesScreen = () => {
  const {
    tab,
    setTab,
    config,
    configText,
    setConfigText,
    isConfigTextDirty,
    setIsConfigTextDirty,
    configError,
    fileStatus,
    configFilePathInput,
    setConfigFilePathInput,
    draggedGoodId,
    setDraggedGoodId,
    skillSearch,
    setSkillSearch,
    ration,
    selectedTemplateIndex,
    selectedTemplate,
    edibleGoods,
    edibleGoodTypes,
    selectedProductionChainIndex,
    selectedProductionChain,
    selectedSkillIndex,
    selectedSkill,
    filteredSkills,
    foodNavigationValue,
    economyNavigationValue,
    syncConfigState,
    patchConfig,
    updateSelectedRationTemplate,
    addRationTemplate,
    duplicateRationTemplate,
    deleteSelectedRationTemplate,
    solveSelectedRation,
    addProductionChain,
    updateSelectedProductionChain,
    duplicateSelectedProductionChain,
    deleteSelectedProductionChain,
    addProductionRecipe,
    updateProductionRecipe,
    deleteProductionRecipe,
    addProductionInput,
    updateProductionInput,
    deleteProductionInput,
    addProductionOutput,
    updateProductionOutput,
    deleteProductionOutput,
    addConsumerProfile,
    updateConsumerProfile,
    deleteConsumerProfile,
    addCharacterSkill,
    updateSelectedSkill,
    duplicateSelectedSkill,
    deleteSelectedSkill,
    addSkillDefault,
    updateSkillDefault,
    deleteSkillDefault,
    addGoodType,
    updateGoodTypeName,
    updateGoodTypeProfile,
    deleteGoodType,
    addGoodLevel,
    updateGoodLevel,
    deleteGoodLevel,
    deleteGood,
    addGoodBiome,
    removeGoodBiome,
    clearGoodBiomes,
    addBiome,
    updateBiome,
    deleteBiome,
    handleGoodDrop,
    importConfigText,
    resetConfig,
    copyConfig,
    loadConfigFromFile,
    saveConfigToFile
  } = useDomainAdmin();

  return (
            <Stack spacing={2.5}>
              <Panel
                title="Biomes"
                icon={<RuleRoundedIcon />}
                action={
                  <Button size="small" startIcon={<AddRoundedIcon />} onClick={addBiome}>
                    Add biome
                  </Button>
                }
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Biome</TableCell>
                      <TableCell align="right">Goods</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {config.biomes.map((biome, index) => (
                      <TableRow key={biome.id}>
                        <TableCell>
                          <TextFieldEditor label="Biome" value={biome.name} onChange={(name) => updateBiome(index, { name })} />
                        </TableCell>
                        <TableCell align="right">
                          {formatNumber(config.goods.filter((good) => good.level === 0 && good.biomeIds.includes(biome.id)).length, 0)}
                        </TableCell>
                        <TableCell>
                          <IconButton color="error" size="small" onClick={() => deleteBiome(biome.id)}>
                            <DeleteRoundedIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Panel>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
                {[...config.biomes, { id: '', name: 'Unassigned' }].map((biome) => {
                  const biomeGoods = config.goods
                    .filter((good) => good.level === 0)
                    .filter((good) => (biome.id ? good.biomeIds.includes(biome.id) : good.biomeIds.length === 0))
                    .sort((left, right) => left.name.localeCompare(right.name, 'ru'));
                  return (
                    <Paper
                      key={biome.id || 'unassigned'}
                      className="source-panel"
                      sx={{ p: 2, minHeight: 180, border: draggedGoodId ? '1px dashed var(--accent)' : '1px solid var(--line)' }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleGoodDrop(biome.id)}
                    >
                      <Stack spacing={1.5}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                          <Typography variant="h6" noWrap>
                            {biome.name}
                          </Typography>
                          <Chip size="small" label={formatNumber(biomeGoods.length, 0)} />
                        </Stack>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {biomeGoods.map((good) => (
                            <Chip
                              key={good.id}
                              draggable
                              label={`${good.name} - ${good.goodType} - ${getGoodLevelName(config, good.level)}`}
                              variant="outlined"
                              onDelete={biome.id ? () => removeGoodBiome(good.id, biome.id) : undefined}
                              onDragStart={() => setDraggedGoodId(good.id)}
                              onDragEnd={() => setDraggedGoodId(null)}
                              sx={{ cursor: 'grab' }}
                            />
                          ))}
                        </Box>
                      </Stack>
                    </Paper>
                  );
                })}
              </Box>
            </Stack>
  );
};
