export interface TransactionMovement {
    date: string;
    category: string;
    description: string;
    account: string;
    holder: string;
    debit: number;
    credit: number;
}
