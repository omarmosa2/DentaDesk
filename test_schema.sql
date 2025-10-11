-- Minimal test schema
CREATE TABLE IF NOT EXISTS test_table (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

-- Insert test data
INSERT OR IGNORE INTO test_table (id, name) VALUES ('test1', 'Test Name');

-- Create index
CREATE INDEX IF NOT EXISTS idx_test_name ON test_table(name);