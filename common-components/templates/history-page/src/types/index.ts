const MEASUREMENT_TYPES = {
    THEME: 'THEME',
    QUALITY: 'QUALITY',
    FOLLOW_UP_ACTION: 'FOLLOW_UP_ACTION',
} as const;

export type MeasurementType =
    (typeof MEASUREMENT_TYPES)[keyof typeof MEASUREMENT_TYPES];

export type CharMeasurementType = {
    readonly chatUuid: string;
    readonly authorId: number;
    readonly authorDisplayName: string;
    readonly type: MeasurementType;
    readonly value: string;
    readonly createdAt: string;
}
