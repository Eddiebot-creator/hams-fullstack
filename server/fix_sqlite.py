import sqlite3

conn = sqlite3.connect("data/hams.sqlite")

try:
    conn.execute(
        "ALTER TABLE meals ADD COLUMN weekday TEXT NOT NULL DEFAULT 'Monday'"
    )
    print("weekday column added")
except Exception as e:
    print(e)

conn.commit()
conn.close()