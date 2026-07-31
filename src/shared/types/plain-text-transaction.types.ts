export interface PlainTextTransactionPayload {
    date: string;
    category: string;
    description: string;
    amount: number;
    account: string;
    holder: string;
}

export interface PlainTextTransactionParseResult {
    payload?: PlainTextTransactionPayload;
    error?: string;
}
