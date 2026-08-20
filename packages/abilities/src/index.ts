/**
 * `@josam/abilities` — one permission model, three consumers (`FEAT-018`, `BR-708`).
 *
 * `PH-1.9` shipped the ability builder. `PH-1.11` adds the capability contract that `_can` is
 * serialized from, and splits the module in three so the shared key vocabulary sits beneath both
 * halves rather than between them:
 *
 *     permission-key.ts   05 §2 keys, the scope taxonomy, and the key → CASL action mapping
 *     define-abilities.ts 05 §8 the CASL rules an actor gets
 *     capability.ts       05 §7 / 11 §1.3 the `_can` and `_reason` wire contract
 *
 * Nothing here decides whether a request proceeds. `BR-710` / `BR-041`: the server re-checks every
 * mutation, and this package decides what to *draw*.
 */

export {
  type ParsedPermission,
  parsePermission,
  DATA_SCOPES,
  abilityActionFor,
} from './permission-key.js';

export {
  type Actor,
  type AppAbility,
  type AppSubject,
  defineAbilitiesFor,
} from './define-abilities.js';

export {
  type Bilingual,
  type Capable,
  type CapabilityMap,
  capabilitiesForCollection,
  capabilitiesForRecord,
  capabilityActionsFor,
  canWithoutRecord,
  type EmittableReasonCode,
  isEmittableReasonCode,
  type Reason,
  type ReasonAction,
  type ReasonActionType,
  ReasonCode,
} from './capability.js';
