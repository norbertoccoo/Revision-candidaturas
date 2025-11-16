// A generic row from the data table, where keys are column headers.
export type TableRow = Record<string, any>;

// Defines the structure for duplicate candidates, grouped by union and then by the combination of other unions.
// Example: { "CCOO": { "UGT, SB": [{ identifier: "John Doe", row: {...} }] } }
export type SubgroupedDuplicates = Record<string, Record<string, {
    identifier: string;
    row: TableRow;
}[]>>;

// FIX: Add MappingSuggestion type to fix import error in MappingModal.tsx.
// Represents a single suggestion for mapping an original column header to an ideal one.
export type MappingSuggestion = {
  original: string;
  suggested: string;
};
