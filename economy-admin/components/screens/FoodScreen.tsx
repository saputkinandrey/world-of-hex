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

export const FoodScreen = () => {
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
              <Panel
                title="Food Profiles"
                icon={<RuleRoundedIcon />}
                action={
                  <Button size="small" startIcon={<AddRoundedIcon />} onClick={addGoodType}>
                    Add profile
                  </Button>
                }
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Good type</TableCell>
                      <TableCell>Edible</TableCell>
                      <TableCell>Valuable proteins</TableCell>
                      <TableCell>lbs</TableCell>
                      <TableCell>Protein</TableCell>
                      <TableCell>Energy</TableCell>
                      <TableCell>Water</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {config.goodTypes.map((goodType, index) => {
                      const profile = getGoodProfile(config, goodType);
                      return (
                        <TableRow key={`${goodType}-${index}`}>
                          <TableCell>
                            <TextFieldEditor label="Type" value={goodType} onChange={(value) => updateGoodTypeName(index, value)} />
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={profile.edible}
                              onChange={(event) => updateGoodTypeProfile(goodType, { edible: event.target.checked })}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {profile.edible ? (
                              <Checkbox
                                checked={profile.valuableProteins}
                                onChange={(event) => updateGoodTypeProfile(goodType, { valuableProteins: event.target.checked })}
                                size="small"
                              />
                            ) : null}
                          </TableCell>
                          <TableCell>
                            {profile.edible ? (
                              <NumberField
                                label="lbs"
                                value={profile.weightPerUnitLbs}
                                min={0}
                                step={0.1}
                                onChange={(weightPerUnitLbs) => updateGoodTypeProfile(goodType, { weightPerUnitLbs })}
                              />
                            ) : null}
                          </TableCell>
                          <TableCell>
                            {profile.edible ? (
                              <NumberField
                                label="Protein"
                                value={profile.proteinRating}
                                min={0}
                                onChange={(proteinRating) => updateGoodTypeProfile(goodType, { proteinRating })}
                              />
                            ) : null}
                          </TableCell>
                          <TableCell>
                            {profile.edible ? (
                              <NumberField
                                label="Energy"
                                value={profile.energyRating}
                                min={0}
                                onChange={(energyRating) => updateGoodTypeProfile(goodType, { energyRating })}
                              />
                            ) : null}
                          </TableCell>
                          <TableCell>
                            {profile.edible ? (
                              <NumberField
                                label="Water"
                                value={profile.waterRating}
                                min={0}
                                step={0.1}
                                onChange={(waterRating) => updateGoodTypeProfile(goodType, { waterRating })}
                              />
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <IconButton color="error" size="small" disabled={config.goodTypes.length <= 1} onClick={() => deleteGoodType(goodType)}>
                              <DeleteRoundedIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Panel>
            </Stack>
  );
};
