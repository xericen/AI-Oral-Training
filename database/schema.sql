-- Legacy SQLite schema only. No participant records.
PRAGMA foreign_keys = ON;

CREATE TABLE calibration_profiles (
	id VARCHAR NOT NULL,
	session_id VARCHAR NOT NULL,
	participant_code VARCHAR NOT NULL,
	created_at VARCHAR NOT NULL,
	"values" JSON NOT NULL, "neutral_jaw_open" FLOAT, "neutral_mouth_open_ratio" FLOAT, "neutral_mouth_pucker" FLOAT, "neutral_cheek_puff" FLOAT, "neutral_shoulder_angle" FLOAT, "neutral_body_alignment" FLOAT,
	PRIMARY KEY (id),
	UNIQUE (session_id),
	FOREIGN KEY(session_id) REFERENCES training_sessions (id)
);

CREATE TABLE step_results (
	id VARCHAR NOT NULL,
	session_id VARCHAR NOT NULL,
	step_id VARCHAR NOT NULL,
	step_name VARCHAR NOT NULL,
	detection_mode VARCHAR NOT NULL,
	started_at VARCHAR,
	completed_at VARCHAR,
	success_count INTEGER NOT NULL,
	target_count INTEGER NOT NULL,
	retry_count INTEGER NOT NULL,
	duration_seconds FLOAT NOT NULL,
	completion_status VARCHAR NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(session_id) REFERENCES training_sessions (id)
);

CREATE TABLE training_sessions (
	id VARCHAR NOT NULL,
	participant_code VARCHAR NOT NULL,
	started_at VARCHAR NOT NULL,
	ended_at VARCHAR,
	status VARCHAR NOT NULL,
	total_duration_seconds FLOAT NOT NULL,
	completed_steps INTEGER NOT NULL,
	total_steps INTEGER NOT NULL,
	rule_version VARCHAR NOT NULL,
	model_version VARCHAR NOT NULL,
	PRIMARY KEY (id)
);

CREATE INDEX ix_step_results_session_id ON step_results (session_id);
