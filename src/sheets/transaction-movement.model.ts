export interface TransactionMovement {
    date: string;
    description: string;
    account: string;
    holder: string;
    debit: number;
    credit: number;
}
