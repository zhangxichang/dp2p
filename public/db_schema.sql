BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "friends" (
	"id"	TEXT,
	"name"	TEXT NOT NULL,
	"avatar"	BLOB,
	"bio"	TEXT,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "user_friends" (
	"id"	INTEGER,
	"user_id"	TEXT,
	"friend_id"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT),
	UNIQUE("user_id","friend_id"),
	FOREIGN KEY("friend_id") REFERENCES "friends"("id"),
	FOREIGN KEY("user_id") REFERENCES "users"("id")
);
CREATE TABLE IF NOT EXISTS "users" (
	"id"	TEXT,
	"key"	BLOB NOT NULL UNIQUE,
	"name"	TEXT NOT NULL,
	"avatar"	BLOB,
	"bio"	TEXT,
	PRIMARY KEY("id")
);
COMMIT;
