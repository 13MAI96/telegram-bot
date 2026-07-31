export interface DashboardMonth {
    month: number;
    year: number;
    label: string;
}

export interface DashboardFilters {
    holders: string[];
    accounts: string[];
    excludedCategories: string[];
    allHolders: boolean;
    allAccounts: boolean;
}

export interface ExpenseCategoryTotal {
    category: string;
    amount: number;
    percentage: number;
}

export interface ExpenseCategoryDashboard {
    month: DashboardMonth;
    holders: string[];
    accounts: string[];
    excludedCategories: string[];
    allHolders: boolean;
    allAccounts: boolean;
    categories: ExpenseCategoryTotal[];
    total: number;
}

export interface SelectionParseResult {
    values?: string[];
    all?: boolean;
    invalidValues?: string[];
}
