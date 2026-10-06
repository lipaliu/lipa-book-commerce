CREATE TABLE IF NOT EXISTS samples (
 id TEXT PRIMARY KEY, product_key TEXT NOT NULL, product TEXT NOT NULL,
 category TEXT NOT NULL, account TEXT, sales_band TEXT, volume_band TEXT,
 video_id TEXT, published_at TEXT, body TEXT, analysis TEXT, buyer_json TEXT,
 scope_status TEXT NOT NULL DEFAULT 'pending', source_window INTEGER,
 captured_at TEXT, snapshot_id TEXT
);
CREATE INDEX IF NOT EXISTS samples_product ON samples(product_key);
CREATE UNIQUE INDEX IF NOT EXISTS samples_video_unique ON samples(video_id) WHERE video_id IS NOT NULL AND video_id!='';
CREATE TABLE IF NOT EXISTS snapshots (
 id TEXT PRIMARY KEY, captured_at TEXT NOT NULL, data_as_of TEXT NOT NULL,
 window_days INTEGER NOT NULL, source TEXT NOT NULL, imported INTEGER NOT NULL,
 excluded INTEGER NOT NULL, quarantined INTEGER NOT NULL, fingerprint TEXT UNIQUE,
 note TEXT
);
CREATE TABLE IF NOT EXISTS snapshot_rows (
 snapshot_id TEXT NOT NULL, source_key TEXT NOT NULL, product_key TEXT NOT NULL,
 data_json TEXT NOT NULL, PRIMARY KEY(snapshot_id,source_key)
);
CREATE TRIGGER IF NOT EXISTS capture_sample_insert AFTER INSERT ON samples BEGIN
 INSERT OR REPLACE INTO snapshot_rows(snapshot_id,source_key,product_key,data_json)
 VALUES(NEW.snapshot_id,NEW.id,NEW.product_key,json_object('product',NEW.product,'category',NEW.category,'account',NEW.account,'sales_band',NEW.sales_band,'volume_band',NEW.volume_band,'video_id',NEW.video_id,'published_at',NEW.published_at));
END;
CREATE TRIGGER IF NOT EXISTS capture_sample_update AFTER UPDATE OF snapshot_id,sales_band,volume_band ON samples BEGIN
 INSERT OR REPLACE INTO snapshot_rows(snapshot_id,source_key,product_key,data_json)
 VALUES(NEW.snapshot_id,NEW.id,NEW.product_key,json_object('product',NEW.product,'category',NEW.category,'account',NEW.account,'sales_band',NEW.sales_band,'volume_band',NEW.volume_band,'video_id',NEW.video_id,'published_at',NEW.published_at));
END;
INSERT OR IGNORE INTO snapshot_rows(snapshot_id,source_key,product_key,data_json)
 SELECT snapshot_id,id,product_key,json_object('product',product,'category',category,'account',account,'sales_band',sales_band,'volume_band',volume_band,'video_id',video_id,'published_at',published_at) FROM samples;
CREATE TABLE IF NOT EXISTS jobs (
 id TEXT PRIMARY KEY, sample_id TEXT NOT NULL, product_key TEXT NOT NULL,
 title TEXT NOT NULL, status TEXT NOT NULL, template TEXT NOT NULL,
 brief_json TEXT NOT NULL, script TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS favorites (product_key TEXT PRIMARY KEY, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sync_runs (
 id TEXT PRIMARY KEY, requested_at TEXT NOT NULL, status TEXT NOT NULL,
 lookback_days INTEGER NOT NULL, excluded_category TEXT NOT NULL, message TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS auth_attempts (key TEXT PRIMARY KEY, failures INTEGER NOT NULL, expires INTEGER NOT NULL);
