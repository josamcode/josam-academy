import { base } from '@josam/config/eslint/base';
import { fitness } from '@josam/config/eslint/fitness';

export default [...base(import.meta.dirname), ...fitness];
