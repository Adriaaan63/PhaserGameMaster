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
        name: 'Ración de comida',
        description: 'Añade una ración para preparar platos durante la noche.',
        price: 8,
        iconFrame: TEXTURE_FOOD,
        type: 'FOOD',
    },
    {
        id: 'repair_scrap',
        name: 'Chatarra de reparación',
        description: 'Material necesario para reparar mobiliario destruido.',
        price: 12,
        iconFrame: UI_MATERIALS_ICON_KEY,
        type: 'SCRAP',
    },
    {
        id: 'empty_glasses',
        name: 'Vasos limpios',
        description: 'Vasos limpios almacenados en la caja de inventario.',
        price: 10,
        iconFrame: TEXTURE_DRINK_EMPTY,
        type: 'EMPTY_GLASSES',
    },
    {
        id: 'round_table',
        name: 'Mesa redonda',
        description: 'Añade una mesa redonda al inventario del modo construcción.',
        price: 45,
        iconFrame: 'round_table_0',
        type: 'FURNITURE',
        furnitureId: 'mesa_redonda_0',
    },
    {
        id: 'standard_bench',
        name: 'Banco',
        description: 'Añade un banco al inventario del modo construcción.',
        price: 25,
        iconFrame: 'table_bench_1',
        type: 'FURNITURE',
        furnitureId: 'silla_estandar_0',
    },
] as const;
