import argparse
import os
import sqlite3
import sys
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_DIR))


TABLES = [
    "users",
    "meals",
    "meal_scans",
    "laundry_baskets",
    "kitchen_scan_logs",
    "laundry_activity",
    "laundry_machines",
    "laundry_reports",
    "system_alerts",
    "analytics_meal_trends",
    "analytics_kpis",
    "notifications",
    "audit_logs",
]


def sqlite_columns(conn, table):
    return [row["name"] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()]


def mysql_columns(conn, table):
    return [row["Field"] for row in conn.execute(f"SHOW COLUMNS FROM {table}").fetchall()]


def copy_table(sqlite_conn, mysql_conn, table, mode):
    sqlite_cols = sqlite_columns(sqlite_conn, table)
    mysql_cols = mysql_columns(mysql_conn, table)
    columns = [column for column in sqlite_cols if column in mysql_cols]
    rows = sqlite_conn.execute(f"SELECT {', '.join(columns)} FROM {table}").fetchall()

    if not rows:
        return 0

    placeholders = ", ".join(["?"] * len(columns))
    column_list = ", ".join(columns)
    updates = ", ".join([f"{column}=VALUES({column})" for column in columns if column != "id"])
    sql = f"INSERT INTO {table} ({column_list}) VALUES ({placeholders})"
    if mode == "merge" and updates:
        sql += f" ON DUPLICATE KEY UPDATE {updates}"

    mysql_conn.executemany(sql, [tuple(row[column] for column in columns) for row in rows])
    return len(rows)


def main():
    parser = argparse.ArgumentParser(description="Copy local HAMS SQLite data into the configured MySQL database.")
    parser.add_argument("--sqlite", default="server/data/hams.sqlite", help="Path to the local SQLite database.")
    parser.add_argument(
        "--mode",
        choices=["merge", "replace"],
        default="merge",
        help="merge keeps existing MySQL rows and updates duplicates; replace clears MySQL tables first.",
    )
    args = parser.parse_args()

    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url.startswith(("mysql://", "mysql+pymysql://")):
        raise SystemExit("Set DATABASE_URL to your MySQL URL before running this migration.")

    sqlite_path = Path(args.sqlite)
    if not sqlite_path.exists():
        raise SystemExit(f"SQLite database not found: {sqlite_path}")

    from server.app import get_connection, init_db

    init_db()

    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row

    with get_connection() as mysql_conn:
        if args.mode == "replace":
            mysql_conn.execute("SET FOREIGN_KEY_CHECKS = 0")
            for table in reversed(TABLES):
                mysql_conn.execute(f"DELETE FROM {table}")
            mysql_conn.execute("SET FOREIGN_KEY_CHECKS = 1")

        copied = {}
        for table in TABLES:
            copied[table] = copy_table(sqlite_conn, mysql_conn, table, args.mode)

        mysql_conn.commit()

    sqlite_conn.close()

    print("Migration complete.")
    for table, count in copied.items():
        print(f"{table}: {count}")


if __name__ == "__main__":
    main()
