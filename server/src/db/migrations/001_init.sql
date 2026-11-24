-- Version 1 schema for Habit Garden.
-- Every table uses InnoDB (supports foreign keys and transactions) and utf8mb4 (supports emoji).

CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(80)  NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  -- IANA timezone name, e.g. 'Asia/Kolkata'. Decides what "today" means for this user.
  timezone      VARCHAR(64)  NOT NULL DEFAULT 'UTC',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions store a SHA-256 HASH of the login token, never the token itself.
-- If this table leaks, the attacker still cannot log in with the hashes.
CREATE TABLE sessions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  token_hash  CHAR(64)     NOT NULL,
  expires_at  DATETIME     NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sessions_token_hash (token_hash),
  KEY idx_sessions_user (user_id),
  KEY idx_sessions_expires (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE habits (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  category    VARCHAR(40)  NULL,
  -- 'daily' | 'weekdays' | 'custom' (custom uses the weekdays bitmask)
  frequency   ENUM('daily', 'weekdays', 'custom') NOT NULL,
  -- Bitmask of scheduled weekdays: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64.
  -- 127 means every day. Weekdays Mon-Fri = 1+2+4+8+16 = 31.
  weekdays    TINYINT UNSIGNED NOT NULL DEFAULT 127,
  start_date  DATE         NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_habits_user (user_id),
  CONSTRAINT chk_habits_weekdays CHECK (weekdays BETWEEN 1 AND 127),
  CONSTRAINT fk_habits_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row = "this habit was done on this calendar day".
-- The UNIQUE key is the real protection against duplicate check-ins.
-- Even if two requests race, the database refuses the second row.
CREATE TABLE check_ins (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  habit_id    INT UNSIGNED NOT NULL,
  check_date  DATE         NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_checkins_habit_date (habit_id, check_date),
  CONSTRAINT fk_checkins_habit FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
