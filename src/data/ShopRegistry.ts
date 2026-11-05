import {
    TEXTURE_DRINK_EMPTY,
    TEXTURE_FOOD,
    UI_MATERIALS_ICON_KEY,
} from './constants';

export type ShopItemType = 'FOOD' | 'SCRAP' | 'FURNITURE' | 'EMPTY_GLASSES';

export interface ShopItem {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly price: number;
    readonly iconFrame: string;
    readonly type: ShopItemType;
    readonly furnitureId?: string;
}

export const SHOP_ITEMS: readonly ShopItem[] = [
    {
        id: 'food_ration',
        name: 'Food Ration',
        description: 'Adds a ration to prepare dishes during the night.',
        price: 8,
        iconFrame: TEXTURE_FOOD,
        type: 'FOOD',
    },
    {
        id: 'repair_scrap',
        name: 'Repair Scrap',
        description: 'Material needed to repair destroyed furniture.',
        price: 12,
        iconFrame: UI_MATERIALS_ICON_KEY,
        type: 'SCRAP',
    },
    {
        id: 'empty_glasses',
        name: 'Clean Glasses',
        description: 'Clean glasses stored in the inventory.',
        price: 10,
        iconFrame: TEXTURE_DRINK_EMPTY,
        type: 'EMPTY_GLASSES',
    },
    {
        id: 'round_table',
        name: 'Round Table',
        description: 'Adds a round table to the construction mode inventory.',
        price: 45,
        iconFrame: 'round_table_0',
        type: 'FURNITURE',
        furnitureId: 'mesa_redonda_0',
    },
    {
        id: 'standard_bench',
        name: 'Bench',
        description: 'Adds a bench to the construction mode inventory.',
        price: 25,
        iconFrame: 'table_bench_1',
        type: 'FURNITURE',
        furnitureId: 'silla_estandar_0',
    },
] as const;
