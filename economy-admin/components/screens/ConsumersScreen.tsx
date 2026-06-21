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
import { useEconomyAdmin } from '../../context/EconomyAdminContext';
import { formatGoodLevel, formatNumber, getGood, getGoodLevelName, getGoodProfile, removeArrayItem, updateArrayItem } from '../../lib/economy-admin-utils';

export const ConsumersScreen = () => {
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
  } = useEconomyAdmin();

  return (
            <Stack spacing={2.5}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                <Metric label="Consumer templates" value={formatNumber(config.consumers.length, 0)} />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2.5 }}>
                <Panel
                  title="Consumer Profiles"
                  icon={<GroupsRoundedIcon />}
                  action={
                    <Button size="small" startIcon={<AddRoundedIcon />} onClick={addConsumerProfile}>
                      Add consumer
                    </Button>
                  }
                >
                    <Table size="small" sx={{ tableLayout: 'fixed', '& .MuiTableCell-root': { px: 0.5 } }}>
                      <TableHead>
                        <TableRow>
                        <TableCell sx={{ minWidth: 160, width: '34%' }}>Name</TableCell>
                        <TableCell sx={{ width: 70 }}>Protein</TableCell>
                        <TableCell sx={{ width: 70 }}>Energy</TableCell>
                        <TableCell sx={{ width: 70 }}>Water</TableCell>
                        <TableCell sx={{ width: 70 }}>Weight</TableCell>
                        <TableCell sx={{ width: 70 }}>Taste</TableCell>
                        <TableCell sx={{ width: 44 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {config.consumers.map((consumer, index) => (
                        <TableRow key={consumer.id}>
                          <TableCell sx={{ minWidth: 160 }}>
                            <TextFieldEditor label="Name" value={consumer.name} onChange={(name) => updateConsumerProfile(index, { name })} />
                          </TableCell>
                          <TableCell sx={{ width: 70 }}>
                            <NumberField label="Protein" value={consumer.targetProtein} min={0} onChange={(targetProtein) => updateConsumerProfile(index, { targetProtein })} />
                          </TableCell>
                          <TableCell sx={{ width: 70 }}>
                            <NumberField label="Energy" value={consumer.targetEnergy} min={0} onChange={(targetEnergy) => updateConsumerProfile(index, { targetEnergy })} />
                          </TableCell>
                          <TableCell sx={{ width: 70 }}>
                            <NumberField label="Water" value={consumer.targetWater} min={0} onChange={(targetWater) => updateConsumerProfile(index, { targetWater })} />
                          </TableCell>
                          <TableCell sx={{ width: 70 }}>
                            <NumberField label="Weight" value={consumer.targetWeightLbs} min={0} step={0.1} onChange={(targetWeightLbs) => updateConsumerProfile(index, { targetWeightLbs })} />
                          </TableCell>
                          <TableCell sx={{ width: 70 }}>
                            <NumberField label="Taste" value={consumer.targetTaste} min={0} step={1} onChange={(targetTaste) => updateConsumerProfile(index, { targetTaste })} />
                          </TableCell>
                          <TableCell sx={{ width: 44 }}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <IconButton color="error" size="small" disabled={config.consumers.length <= 1} onClick={() => deleteConsumerProfile(consumer.id)}>
                                <DeleteRoundedIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Panel>

              </Box>
            </Stack>
  );
};
