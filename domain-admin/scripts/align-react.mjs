import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const nodeModulesRoot = path.join(projectRoot, 'node_modules');
const duplicatedPackages = ['react', 'react-dom'];

const isInsideNodeModules = (targetPath) => {
  const relativePath = path.relative(nodeModulesRoot, targetPath);
  return Boolean(relativePath) && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
};

for (const packageName of duplicatedPackages) {
  const packagePath = path.join(nodeModulesRoot, packageName);
  if (!isInsideNodeModules(packagePath)) {
    throw new Error(`Refusing to remove outside node_modules: ${packagePath}`);
  }
  await fs.rm(packagePath, { recursive: true, force: true });
}
