export declare const version = "0.1.0";
export type AlertCondition = 'above' | 'below';
export interface AuthenticatedUser {
    id: string;
    firebaseId: string;
    email: string;
    name?: string | null;
}
export interface FirebaseUserTokenClaims {
    uid: string;
    email?: string;
    name?: string;
}
export interface CreateAlertInput {
    symbol: string;
    price: number;
    condition: AlertCondition;
    threshold: number;
}
//# sourceMappingURL=index.d.ts.map