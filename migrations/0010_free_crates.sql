-- UTC calendar periods for the three free crates. Existing inventory remains intact.
ALTER TABLE progress ADD COLUMN free_crate_claims_json TEXT NOT NULL DEFAULT '{}';
