import { Events } from 'phaser';

import type { OrderItemId } from '../data/GameRegistry';
import type { ClientRace } from '../data/GameRegistry';
import type { WantedProfile } from '../data/GameRegistry';
import type { FurnitureCategory } from '../data/FurnitureRegistry';

export const EVENT_GAME_READY = 'game-ready';

// Pre-Apertura (Construcción) / Placement events
export const EVENT_START_PLACEMENT = 'placement:start';
export const EVENT_DRAG_MOVE = 'placement:move';
export const EVENT_DRAG_END = 'placement:end';
export const EVENT_FURNITURE_PLACED = 'furniture:placed';
export const EVENT_FURNITURE_REMOVED = 'furniture:removed';
export const EVENT_CANTINA_OPEN = 'cantina:open';
export const EVENT_GAME_MODE_CHANGED = 'game:mode-changed';
export const EVENT_GAME_WARNING = 'game:warning';
export const EVENT_TOGGLE_CLIENT_GUIDE = 'ui:toggle-client-guide';
export const EVENT_TOGGLE_MATERIALS = 'ui:toggle-materials';
export const EVENT_CREDITS_UPDATED = 'economy:credits-updated';
export const EVENT_SCRAPS_UPDATED = 'inventory:scraps-updated';
export const EVENT_GLASSES_UPDATED = 'inventory:glasses-updated';
export const EVENT_NIGHT_TIMER_UPDATED = 'game:night-timer-updated';
export const EVENT_NIGHT_ENDED = 'game:night-ended';
export const EVENT_NIGHT_END_REQUESTED = 'game:night-end-requested';
export const EVENT_NIGHT_END_READY = 'game:night-end-ready';
export const EVENT_NIGHT_TRANSITION_COMPLETE = 'game:night-transition-complete';
export const EVENT_TUTORIAL_STARTED = 'tutorial:started';
export const EVENT_TUTORIAL_ADVANCE = 'tutorial:advance';
export const EVENT_TUTORIAL_CLOSED = 'tutorial:closed';
export const EVENT_TUTORIAL_POINTER = 'tutorial:pointer';
export const EVENT_TUTORIAL_DRAG = 'tutorial:drag';
export const EVENT_TUTORIAL_DRAG_COMPLETED = 'tutorial:drag-completed';
export const EVENT_TUTORIAL_BUTTON_HINT = 'tutorial:button-hint';
export const EVENT_TUTORIAL_PAUSE_CHANGED = 'tutorial:pause-changed';
export const EVENT_NIGHT_FEATURES_CHANGED = 'game:night-features-changed';
export const EVENT_PLAYER_ACTION_PROGRESS = 'player:action-progress';
export const EVENT_FOOD_STOCK_UPDATED = 'station:food-stock-updated';
export const EVENT_SHOP_FOOD_PURCHASED = 'shop:food-purchased';
export const EVENT_CLIENT_SELECTED = 'client:selected';
export const EVENT_CHAIR_ASSIGNED = 'client:chair-assigned';
export const EVENT_CLIENT_SEATED = 'client:seated';
export const EVENT_CLIENT_SPAWNED = 'client:spawned';
export const EVENT_INTERACTABLE_PICKED = 'interaction:object-picked';
export const EVENT_BEVERAGE_FILLED = 'interaction:beverage-filled';
export const EVENT_CLIENT_ORDER_STARTED = 'client:order-started';
export const EVENT_CLIENT_SEAT_VACATED = 'client:seat-vacated';
export const EVENT_CLIENT_LEAVING = 'client:leaving';
export const EVENT_CLIENT_SATISFIED = 'client:satisfied';
export const EVENT_COIN_COLLECTED = 'economy:coin-collected';
export const EVENT_COIN_STOLEN = 'economy:coin-stolen';
export const EVENT_CLIENT_EXIT_PATH_FAILED = 'client:exit-path-failed';
export const EVENT_FIGHT_REQUESTED = 'fight:requested';
export const EVENT_FIGHT_APPROACH_COMPLETE = 'fight:approach-complete';
export const EVENT_FIGHT_APPROACH_FAILED = 'fight:approach-failed';
export const EVENT_FIGHT_STARTED = 'fight:started';
export const EVENT_FIGHT_STOPPED = 'fight:stopped';
export const EVENT_CLIENT_MURDERED = 'client:murdered';
export const EVENT_HEAT_UPDATED = 'threat:heat-updated';
export const EVENT_IMPERIAL_RAID = 'threat:imperial-raid';
export const EVENT_REPUTATION_UPDATED = 'reputation:updated';
export const EVENT_JABBA_RAID_STARTED = 'reputation:jabba-raid-started';
export const EVENT_JABBA_RAID_ENDED = 'reputation:jabba-raid-ended';
export const EVENT_DEAD_BODY_CREATED = 'aftermath:dead-body-created';
export const EVENT_DEAD_BODY_CLEANED = 'aftermath:dead-body-cleaned';
export const EVENT_FURNITURE_REPAIRED = 'furniture:repaired';
export const EVENT_TOGGLE_BUILD_MODE = 'build-mode:toggled';
export const EVENT_BAND_STARTED = 'band:started';
export const EVENT_OPEN_WANTED_POSTER = 'wanted:poster-open';
export const EVENT_CLOSE_WANTED_POSTER = 'wanted:poster-close';
export const EVENT_WANTED_PROFILE_UPDATED = 'wanted:profile-updated';
export const EVENT_WANTED_INSPECTION_STARTED = 'wanted:inspection-started';
export const EVENT_WANTED_ARRESTED = 'wanted:arrested';
export const EVENT_WANTED_ESCAPED = 'wanted:escaped';
export const EVENT_WANTED_REWARD_GRANTED = 'wanted:reward-granted';

export interface BuildModeToggledData { readonly enabled: boolean; }
export interface TutorialButtonHintData {
    readonly button: 'open' | 'materials' | 'guide';
    readonly visible: boolean;
}
export interface ToggleClientGuideData { readonly enabled: boolean; }
export interface ToggleMaterialsData { readonly enabled: boolean; }
export interface CreditsUpdatedData { readonly totalCredits: number; }
export interface ScrapsUpdatedData { readonly stock: number; }
export interface GlassesUpdatedData { readonly stock: number; }
export interface BandStartedData { readonly durationMs: number; }
export interface WantedProfileData { readonly profile: WantedProfile; }
export interface WantedClientData { readonly clientId: number; }
export interface WantedRewardData {
    readonly rewardCredits: number;
    readonly totalCredits: number;
}
export interface NightTimerUpdatedData { readonly remainingMs: number; }
export interface NightEndedData {
    readonly completedNight: number;
    readonly nextNight: number;
    readonly reason: 'TIME' | 'TUTORIAL_CONDITION';
}
export interface NightEndRequestedData {
    readonly completedNight: number;
    readonly nextNight: number;
    readonly reason: 'TIME' | 'TUTORIAL_CONDITION';
}
export interface TutorialStartedData {
    readonly text: string;
    readonly pauseGameplay: boolean;
}
export interface TutorialPointerData {
    readonly x: number;
    readonly y: number;
    readonly visible: boolean;
    readonly points?: readonly { readonly x: number; readonly y: number }[];
}
export interface TutorialDragData {
    readonly sourceX: number;
    readonly sourceY: number;
    readonly targetX: number;
    readonly targetY: number;
}
export interface TutorialPauseChangedData { readonly paused: boolean; }
export interface NightFeaturesData {
    readonly clientGuideEnabled: boolean;
    readonly advancedSystemsEnabled: boolean;
}
export interface PlayerActionProgressData {
    readonly active: boolean;
    readonly progress: number;
    readonly action: 'FILLING' | 'CLEANING';
}

export interface ClientSelectedData { readonly clientId: number; }
export interface ChairAssignedData { readonly clientId: number; readonly tileX: number; readonly tileY: number; }
export interface ClientSeatedData {
    readonly clientId: number;
    readonly race: ClientRace;
    readonly tileX: number;
    readonly tileY: number;
    readonly isWanted?: boolean;
}
export interface ClientSpawnedData { readonly clientId: number; }
export interface InteractablePickedData {
    readonly objectType: 'EMPTY_CUP' | 'FILLED_CUP' | 'FOOD_PLATE';
    readonly tileX: number;
    readonly tileY: number;
}
export interface BeverageFilledData { readonly tileX: number; readonly tileY: number; }
export interface ClientOrderStartedData {
    readonly clientId: number;
    readonly orderItemId: OrderItemId;
}
export interface ClientSeatVacatedData {
    readonly clientId: number;
    readonly tileX: number;
    readonly tileY: number;
}
export interface ClientLeavingData { readonly clientId: number; }
export interface FightRequestedData {
    readonly clientId: number;
    readonly opponentClientId: number;
}
export interface FightApproachData {
    readonly clientId: number;
    readonly opponentClientId: number;
}
export interface FightStartedData { readonly clientIds: readonly [number, number]; }
export interface FightStoppedData {
    readonly clientIds: readonly [number, number];
    readonly reason: 'PLAYER_INTERVENTION' | 'RESOLVED';
}
export interface ClientMurderedData {
    readonly deadClientId: number;
    readonly fleeingClientId: number;
    readonly tileX: number;
    readonly tileY: number;
    readonly furnitureTileX: number;
    readonly furnitureTileY: number;
}
export interface HeatUpdatedData {
    readonly currentHeat: number;
    readonly addedHeat: number;
}
export interface ImperialRaidData { readonly heat: number; }
export interface ReputationUpdatedData {
    readonly currentReputation: number;
    readonly change: number;
}
export interface JabbaRaidStartedData { readonly reputation: number; }
export interface JabbaRaidEndedData { readonly destroyedFurnitureCount: number; }
export interface DeadBodyData {
    readonly tileX: number;
    readonly tileY: number;
}
export interface FurnitureRepairedData {
    readonly tileX: number;
    readonly tileY: number;
}
export interface ClientSatisfiedData {
    readonly clientId: number;
    readonly orderItemId: OrderItemId;
    readonly seatTileX: number;
    readonly seatTileY: number;
}
export interface CoinCollectedData { readonly value: number; readonly totalCredits: number; }
export interface CoinStolenData { readonly value: number; }
export interface ClientExitPathFailedData {
    readonly clientId: number;
    readonly start: { readonly tileX: number; readonly tileY: number };
    readonly exit: { readonly tileX: number; readonly tileY: number } | null;
    readonly reason: 'EXIT_NOT_CONFIGURED' | 'NO_PATH';
}

/**
 * @deprecated Use `FurnitureCategory` from `FurnitureRegistry` instead.
 * Kept temporarily for backward-compatible tile-type checks.
 */
export type FurnitureType = FurnitureCategory;

export type GameMode = 'PRE_APERTURA' | 'NOCHE' | 'DIA';
export const GAME_MODE_PRE_OPENING: GameMode = 'PRE_APERTURA';
export const GAME_MODE_NIGHT: GameMode = 'NOCHE';
export const GAME_MODE_DAY: GameMode = 'DIA';

export interface GameModeChangedData {
    readonly mode: GameMode;
}

export interface GameWarningData {
    readonly message: string;
}

/**
 * Emitted when the player starts dragging a furniture item from inventory.
 * Now carries the specific `furnitureId` from the registry instead of a
 * generic type string.
 */
export interface PlacementStartData {
    /** ID of the furniture config (e.g. `mesa_redonda_0`). */
    readonly furnitureId: string;
    readonly screenX?: number;
    readonly screenY?: number;
}

export interface PlacementMoveData {
    readonly screenX: number;
    readonly screenY: number;
}

export interface PlacementEndData {
    readonly screenX: number;
    readonly screenY: number;
}

/**
 * Emitted when a piece of furniture is successfully placed on the grid.
 * Carries the specific `furnitureId` and the root tile coordinates.
 */
export interface FurniturePlacedData {
    readonly furnitureId: string;
    readonly tileX: number;
    readonly tileY: number;
}

/**
 * Emitted when a piece of placed furniture is removed from the grid.
 * Carries the specific `furnitureId` and the root tile coordinates.
 */
export interface FurnitureRemovedData {
    readonly furnitureId: string;
    readonly tileX: number;
    readonly tileY: number;
}

export interface FoodStockUpdatedData {
    readonly stock: number;
}

export class EventBus extends Events.EventEmitter {}

export const eventBus = new EventBus();
