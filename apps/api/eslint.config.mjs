import { fitness, moduleBoundaries } from '@josam/config/eslint/fitness';
import { node } from '@josam/config/eslint/node';

export default [...node(import.meta.dirname), ...fitness, moduleBoundaries];
