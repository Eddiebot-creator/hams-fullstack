import sqlite3
import pymysql

# SQLite connection
sqlite_conn = sqlite3.connect("server/data/hams.sqlite")
sqlite_cursor = sqlite_conn.cursor()

# MySQL connection
mysql_conn = pymysql.connect(
    host="localhost",
    user="root",
    password="Godfirst246@#",
    database="hams"
)

mysql_cursor = mysql_conn.cursor()

# Get tables
sqlite_cursor.execute(
    "SELECT name FROM sqlite_master WHERE type='table';"
)

tables = sqlite_cursor.fetchall()

for table in tables:
    table_name = table[0]

    if table_name == "sqlite_sequence":
        continue

    print(f"Migrating: {table_name}")

    sqlite_cursor.execute(f"PRAGMA table_info({table_name})")
    columns = sqlite_cursor.fetchall()

    column_defs = []

    for col in columns:
        name = col[1]
        col_type = col[2]

        if "INT" in col_type.upper():
            mysql_type = "INT"
        else:
            mysql_type = "TEXT"

        if col[5] == 1:
            column_defs.append(
                f"`{name}` INT PRIMARY KEY AUTO_INCREMENT"
            )
        else:
            column_defs.append(
                f"`{name}` {mysql_type}"
            )

    create_sql = f"""
    CREATE TABLE IF NOT EXISTS `{table_name}` (
        {', '.join(column_defs)}
    )
    """

    mysql_cursor.execute(create_sql)

    sqlite_cursor.execute(f"SELECT * FROM {table_name}")
    rows = sqlite_cursor.fetchall()

    if rows:
        placeholders = ", ".join(["%s"] * len(rows[0]))

        insert_sql = f"""
        INSERT INTO `{table_name}`
        VALUES ({placeholders})
        """

        for row in rows:
            mysql_cursor.execute(insert_sql, row)

    mysql_conn.commit()

print("Migration complete!")

sqlite_conn.close()
mysql_conn.close()