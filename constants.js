// New file
export const RAW_TO_PROCESSED = {
    wood: 'planks',
    stone: 'bricks',
    food: 'cooked_food',
};

export const PROCESSED_TO_RAW = Object.fromEntries(Object.entries(RAW_TO_PROCESSED).map(([k, v]) => [v, k]));

