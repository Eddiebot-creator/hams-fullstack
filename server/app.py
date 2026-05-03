import os
import queue
import sqlite3
import time
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from flask import Flask, Response, g, has_request_context, jsonify, request, send_from_directory
from werkzeug.security import check_password_hash, generate_password_hash

try:
    import pymysql
except ImportError:
    pymysql = None


BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
DATA_DIR = BASE_DIR / "data"
DATABASE_URL = os.environ.get("DATABASE_URL", "")
DB_PATH = Path(DATABASE_URL or DATA_DIR / "hams.sqlite")
STATIC_DIR = PROJECT_DIR / "dist"
IS_MYSQL = DATABASE_URL.startswith(("mysql://", "mysql+pymysql://"))
DB_INTEGRITY_ERROR = (sqlite3.IntegrityError,) + ((pymysql.err.IntegrityError,) if pymysql else ())
DB_INIT_ERROR = None
MYSQL_POOL = queue.LifoQueue(maxsize=int(os.environ.get("MYSQL_POOL_SIZE", "5")))
RESPONSE_CACHE = {}


def clear_response_cache():
    RESPONSE_CACHE.clear()


def cached_json(key, ttl, factory):
    now = time.time()
    cached = RESPONSE_CACHE.get(key)
    if cached and cached["expires_at"] > now:
        return jsonify(cached["value"])
    value = factory()
    RESPONSE_CACHE[key] = {"expires_at": now + ttl, "value": value}
    return jsonify(value)


def mysql_config_from_url(database_url):
    parsed = urlparse(database_url.replace("mysql+pymysql://", "mysql://", 1))
    query = parse_qs(parsed.query)
    config = {
        "host": parsed.hostname,
        "port": parsed.port or 3306,
        "user": unquote(parsed.username or ""),
        "password": unquote(parsed.password or ""),
        "database": parsed.path.lstrip("/"),
        "charset": "utf8mb4",
        "cursorclass": pymysql.cursors.DictCursor,
        "autocommit": False,
    }
    ssl_mode = query.get("ssl-mode", query.get("ssl_mode", [""]))[0].lower()
    if ssl_mode in {"required", "require", "true", "1"} or parsed.hostname and parsed.hostname.endswith(".aivencloud.com"):
        config["ssl"] = {}
    return config


def mysql_schema(sql):
    return (
        sql.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "INT AUTO_INCREMENT PRIMARY KEY")
        .replace("DEFAULT CURRENT_TIMESTAMP", "DEFAULT CURRENT_TIMESTAMP")
    )


class DatabaseConnection:
    def __init__(self):
        self.from_pool = False
        if IS_MYSQL:
            if pymysql is None:
                raise RuntimeError("PyMySQL is required for MySQL. Run: pip install PyMySQL")
            try:
                self.conn = MYSQL_POOL.get_nowait()
                self.conn.ping(reconnect=True)
                self.from_pool = True
            except queue.Empty:
                self.conn = pymysql.connect(**mysql_config_from_url(DATABASE_URL))
        else:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            self.conn = sqlite3.connect(DB_PATH)
            self.conn.row_factory = sqlite3.Row
            self.conn.execute("PRAGMA foreign_keys = ON")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        if exc_type:
            self.conn.rollback()
        self.close(discard=bool(exc_type))

    def close(self, discard=False):
        if IS_MYSQL:
            if discard:
                self.conn.close()
                return
            try:
                self.conn.rollback()
                MYSQL_POOL.put_nowait(self.conn)
            except queue.Full:
                self.conn.close()
            return
        self.conn.close()

    def execute(self, sql, params=()):
        if IS_MYSQL:
            cursor = self.conn.cursor()
            cursor.execute(mysql_schema(sql).replace("?", "%s"), params)
            return cursor
        return self.conn.execute(sql, params)

    def executemany(self, sql, params):
        if IS_MYSQL:
            cursor = self.conn.cursor()
            cursor.executemany(mysql_schema(sql).replace("?", "%s"), params)
            return cursor
        return self.conn.executemany(sql, params)

    def executescript(self, script):
        if IS_MYSQL:
            cursor = self.conn.cursor()
            for statement in script.split(";"):
                statement = statement.strip()
                if statement:
                    cursor.execute(mysql_schema(statement))
            return cursor
        return self.conn.executescript(script)

    def commit(self):
        self.conn.commit()


def get_connection():
    return DatabaseConnection()


def get_request_connection():
    if not has_request_context():
        return None
    if "db_conn" not in g:
        g.db_conn = get_connection()
    return g.db_conn


def table_columns(conn, table_name):
    if IS_MYSQL:
        rows = conn.execute(f"SHOW COLUMNS FROM {table_name}").fetchall()
        return [row["Field"] for row in rows]
    return [row["name"] for row in conn.execute(f"PRAGMA table_info({table_name})").fetchall()]


def query_one(sql, params=()):
    conn = get_request_connection()
    if conn:
        row = conn.execute(sql, params).fetchone()
    else:
        with get_connection() as conn:
            row = conn.execute(sql, params).fetchone()
    return dict(row) if row else None


def query_all(sql, params=()):
    conn = get_request_connection()
    if conn:
        rows = conn.execute(sql, params).fetchall()
    else:
        with get_connection() as conn:
            rows = conn.execute(sql, params).fetchall()
    return [dict(row) for row in rows]


def init_db():
    global DB_INIT_ERROR
    with get_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name VARCHAR(255) NOT NULL,
              email VARCHAR(255) NOT NULL UNIQUE,
              password VARCHAR(255) NOT NULL,
              role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'kitchen', 'laundry', 'admin')),
              student_id VARCHAR(255) UNIQUE,
              hostel VARCHAR(255),
              room VARCHAR(255),
              course VARCHAR(255),
              level VARCHAR(255),
              phone VARCHAR(255),
              status VARCHAR(50) NOT NULL DEFAULT 'Active'
            );

            CREATE TABLE IF NOT EXISTS meals (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              type VARCHAR(255) NOT NULL,
              start_time VARCHAR(255) NOT NULL,
              end_time VARCHAR(255) NOT NULL,
              menu TEXT NOT NULL,
              status VARCHAR(50) NOT NULL DEFAULT 'Upcoming'
            );

            CREATE TABLE IF NOT EXISTS meal_scans (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              student_id VARCHAR(255) NOT NULL,
              meal_id INTEGER NOT NULL,
              scanned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (meal_id) REFERENCES meals(id)
            );

            CREATE TABLE IF NOT EXISTS laundry_baskets (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              basket_code VARCHAR(255) NOT NULL UNIQUE,
              student_id VARCHAR(255) NOT NULL,
              status VARCHAR(50) NOT NULL,
              received_at VARCHAR(255) NOT NULL,
              estimated_finish VARCHAR(255),
              notes TEXT
            );

            CREATE TABLE IF NOT EXISTS kitchen_scan_logs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              student_id VARCHAR(255) NOT NULL,
              meal_type VARCHAR(255) NOT NULL,
              scanned_time VARCHAR(255) NOT NULL,
              status VARCHAR(255) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS laundry_activity (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              basket_code VARCHAR(255) NOT NULL,
              action VARCHAR(255) NOT NULL,
              staff_name VARCHAR(255) NOT NULL,
              activity_time VARCHAR(255) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS laundry_machines (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name VARCHAR(255) NOT NULL UNIQUE,
              machine_type VARCHAR(255) NOT NULL,
              usage_percent INTEGER NOT NULL,
              status VARCHAR(50) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS laundry_reports (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              report_period VARCHAR(255) NOT NULL,
              total_baskets_processed INTEGER NOT NULL,
              average_turnaround VARCHAR(255) NOT NULL,
              reported_issues INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS system_alerts (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              alert_type VARCHAR(255) NOT NULL,
              message TEXT NOT NULL,
              alert_time VARCHAR(255) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS analytics_meal_trends (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              day_label VARCHAR(255) NOT NULL UNIQUE,
              attendance_count INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS analytics_kpis (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name VARCHAR(255) NOT NULL UNIQUE,
              value VARCHAR(255) NOT NULL,
              delta VARCHAR(255) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS notifications (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_role VARCHAR(50) NOT NULL,
              student_id VARCHAR(255),
              title VARCHAR(255) NOT NULL,
              message TEXT NOT NULL,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              is_read INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS audit_logs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              actor VARCHAR(255) NOT NULL,
              action VARCHAR(255) NOT NULL,
              entity_type VARCHAR(255) NOT NULL,
              entity_ref VARCHAR(255),
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            """
        )

        user_columns = table_columns(conn, "users")
        if "room" not in user_columns:
            conn.execute("ALTER TABLE users ADD COLUMN room VARCHAR(255)")

        seed_db(conn)
        seed_supporting_tables(conn)
    DB_INIT_ERROR = None


def init_db_safely():
    global DB_INIT_ERROR
    try:
        init_db()
    except Exception as exc:
        DB_INIT_ERROR = str(exc)
        print(f"Database initialization failed: {DB_INIT_ERROR}")
        if not IS_MYSQL:
            raise


def seed_db(conn):
    demo_password = generate_password_hash("password")
    if table_count(conn, "users") == 0:
        users = [
            ("Samuel Tokunbo", "student@example.com", demo_password, "student", "240011223", "Blue Nile", "Room 402", "Computer Science", "200 Lv", "+234 8097665431", "Active"),
            ("Kitchen Staff", "kitchen@example.com", demo_password, "kitchen", None, None, None, None, None, None, "Active"),
            ("Laundry Staff", "laundry@example.com", demo_password, "laundry", None, None, None, None, None, None, "Active"),
            ("Admin User", "admin@example.com", demo_password, "admin", None, None, None, None, None, None, "Active"),
            ("Odafe Ojaraida", "20221068@nileuniversity.edu.ng", demo_password, "student", "20221068", "Zambezi", "212", "Mass Communication", "300 Lv", "+234 8010000001", "Active"),
            ("Raymond Chidi", "241144562@nileuniversity.edu.ng", demo_password, "student", "241144562", "Orange", "105", "Software Engineering", "100 Lv", "+234 8010000002", "Active"),
            ("Emmanuella Davies", "20234478@nileuniversity.edu.ng", demo_password, "student", "20234478", "Missisipi", "210", "Economics", "200 Lv", "+234 8010000003", "Inactive"),
            ("Emily Okoro", "211289045@nileuniversity.edu.ng", demo_password, "student", "211289045", "Nile Delta", "304", "Law", "400 Lv", "+234 8010000004", "Active"),
        ]

        conn.executemany(
            """
            INSERT INTO users (name, email, password, role, student_id, hostel, room, course, level, phone, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            users,
        )

    if table_count(conn, "meals") == 0:
        conn.executemany(
            "INSERT INTO meals (type, start_time, end_time, menu, status) VALUES (?, ?, ?, ?, ?)",
            [
                ("Breakfast", "07:30 AM", "09:30 AM", "Pancakes, Scrambled Eggs, Coffee", "Completed"),
                ("Lunch", "12:30 PM", "02:30 PM", "Grilled Chicken Salad, Soup", "Active"),
                ("Dinner", "07:30 PM", "09:30 PM", "Spaghetti Bolognese, Garlic Bread", "Upcoming"),
            ],
        )

    if table_count(conn, "meal_scans") == 0:
        breakfast = conn.execute("SELECT id FROM meals WHERE type = ? ORDER BY id LIMIT 1", ("Breakfast",)).fetchone()
        if breakfast:
            conn.execute(
                "INSERT INTO meal_scans (student_id, meal_id, scanned_at) VALUES (?, ?, ?)",
                ("240011223", breakfast["id"], "2026-05-01 08:05:00"),
            )

    if table_count(conn, "laundry_baskets") == 0:
        conn.executemany(
            """
            INSERT INTO laundry_baskets (basket_code, student_id, status, received_at, estimated_finish, notes)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                ("1042", "240011223", "Washing", "Today, 9:15 AM", "Today, 4:00 PM", "Washing in Progress"),
                ("1045", "241144562", "Pending", "Today, 9:45 AM", "Today, 5:00 PM", None),
                ("1021", "20221068", "Ready", "Yesterday, 4:30 PM", "Ready now", None),
                ("0984", "211289045", "Picked Up", "Yesterday, 2:15 PM", None, None),
            ],
        )
    conn.commit()


def table_count(conn, table_name):
    return conn.execute(f"SELECT COUNT(*) AS count FROM {table_name}").fetchone()["count"]


def table_count_value(table_name):
    conn = get_request_connection()
    if conn:
        return table_count(conn, table_name)
    with get_connection() as conn:
        return table_count(conn, table_name)


def database_counts():
    tables = [
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
    return {table: table_count_value(table) for table in tables}


def log_action(conn, actor, action, entity_type, entity_ref=None):
    conn.execute(
        "INSERT INTO audit_logs (actor, action, entity_type, entity_ref) VALUES (?, ?, ?, ?)",
        (actor, action, entity_type, entity_ref),
    )


def create_notification(conn, user_role, title, message, student_id=None):
    conn.execute(
        """
        INSERT INTO notifications (user_role, student_id, title, message)
        VALUES (?, ?, ?, ?)
        """,
        (user_role, student_id, title, message),
    )


def seed_supporting_tables(conn):
    if table_count(conn, "kitchen_scan_logs") == 0:
        conn.executemany(
            """
            INSERT INTO kitchen_scan_logs (student_id, meal_type, scanned_time, status)
            VALUES (?, ?, ?, ?)
            """,
            [
                ("241156894", "Breakfast", "07:20 AM", "Success"),
                ("20221453", "Breakfast", "07:45 AM", "Success"),
                ("20231452", "Breakfast", "08:42 AM", "Denied (Already Scanned)"),
                ("20237775", "Breakfast", "08:45 AM", "Success"),
                ("240011223", "Lunch", "12:55 PM", "Success"),
                ("20221068", "Dinner", "07:45 PM", "Success"),
            ],
        )

    if table_count(conn, "laundry_activity") == 0:
        conn.executemany(
            """
            INSERT INTO laundry_activity (basket_code, action, staff_name, activity_time)
            VALUES (?, ?, ?, ?)
            """,
            [
                ("1042", "Started Washing", "Mustapha M.", "10:15 AM"),
                ("1021", "Marked Ready", "John K.", "10:05 AM"),
                ("1045", "Received", "Sarah E.", "09:45 AM"),
                ("0984", "Picked Up", "Temi A.", "09:30 AM"),
                ("1048", "Issue Reported", "Sarah E.", "Yesterday, 5:20 PM"),
            ],
        )

    if table_count(conn, "laundry_machines") == 0:
        conn.executemany(
            """
            INSERT INTO laundry_machines (name, machine_type, usage_percent, status)
            VALUES (?, ?, ?, ?)
            """,
            [
                ("Washer 1", "Washer", 85, "Active"),
                ("Washer 2", "Washer", 90, "Active"),
                ("Dryer 1", "Dryer", 75, "Active"),
                ("Dryer 2", "Dryer", 0, "Maintenance"),
            ],
        )

    if table_count(conn, "laundry_reports") == 0:
        conn.executemany(
            """
            INSERT INTO laundry_reports (report_period, total_baskets_processed, average_turnaround, reported_issues)
            VALUES (?, ?, ?, ?)
            """,
            [
                ("Weekly Summary", 342, "24h 15m", 5),
                ("Monthly Summary", 1284, "23h 40m", 18),
                ("Current Shift", 47, "6h 30m", 2),
            ],
        )

    if table_count(conn, "system_alerts") == 0:
        conn.executemany(
            """
            INSERT INTO system_alerts (alert_type, message, alert_time)
            VALUES (?, ?, ?)
            """,
            [
                ("warning", "High load on Kitchen Scanner 2", "10 mins ago"),
                ("info", "Database backup completed successfully", "1 hour ago"),
                ("error", "Laundry Machine 4 reported error code E-02", "2 hours ago"),
            ],
        )

    if table_count(conn, "analytics_meal_trends") == 0:
        conn.executemany(
            """
            INSERT INTO analytics_meal_trends (day_label, attendance_count)
            VALUES (?, ?)
            """,
            [
                ("Mon", 650),
                ("Tue", 780),
                ("Wed", 820),
                ("Thu", 700),
                ("Fri", 850),
                ("Sat", 900),
                ("Sun", 750),
            ],
        )

    if table_count(conn, "analytics_kpis") == 0:
        conn.executemany(
            """
            INSERT INTO analytics_kpis (name, value, delta)
            VALUES (?, ?, ?)
            """,
            [
                ("Average Meal Scan Time", "1.2s", "-0.3s"),
                ("Laundry Turnaround Time", "22.5h", "-1.5h"),
                ("Active Students", "98.5%", "+0.5%"),
            ],
        )

    if table_count(conn, "notifications") == 0:
        conn.executemany(
            """
            INSERT INTO notifications (user_role, student_id, title, message)
            VALUES (?, ?, ?, ?)
            """,
            [
                ("student", "240011223", "Laundry in progress", "Basket #1042 is currently washing."),
                ("admin", None, "System ready", "HAMS backend and database are online."),
                ("laundry", None, "Pending baskets", "There are baskets waiting for laundry processing."),
            ],
        )

    conn.commit()


def create_app():
    app = Flask(__name__, static_folder=None)
    init_db_safely()

    @app.teardown_request
    def close_request_connection(_error=None):
        conn = g.pop("db_conn", None)
        if conn is not None:
            conn.close(discard=bool(_error))

    @app.after_request
    def add_cors_headers(response):
        if request.method != "GET":
            clear_response_cache()
        origin = request.headers.get("Origin", "")
        allowed_origin = os.environ.get("CLIENT_ORIGIN")
        if allowed_origin:
            response.headers["Access-Control-Allow-Origin"] = allowed_origin
        elif (
            origin.startswith("http://localhost:")
            or origin.startswith("http://127.0.0.1:")
            or origin.endswith(".trycloudflare.com")
            or origin.endswith(".ngrok-free.app")
        ):
            response.headers["Access-Control-Allow-Origin"] = origin
        else:
            response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
        return response

    @app.route("/api/<path:_path>", methods=["OPTIONS"])
    def options(_path):
        return ("", 204)

    @app.get("/api/health")
    def health():
        return jsonify({"ok": True, "database": "mysql" if IS_MYSQL else "sqlite", "databaseReady": DB_INIT_ERROR is None})

    @app.get("/api/database/health")
    def database_health():
        if DB_INIT_ERROR:
            init_db_safely()
        if DB_INIT_ERROR:
            return jsonify({"ok": False, "database": "mysql" if IS_MYSQL else "sqlite", "message": DB_INIT_ERROR}), 500
        try:
            count = table_count_value("users")
        except Exception as exc:
            return jsonify({"ok": False, "database": "mysql" if IS_MYSQL else "sqlite", "message": str(exc)}), 500
        return jsonify({"ok": True, "database": "mysql" if IS_MYSQL else "sqlite", "users": count})

    @app.post("/api/database/repair")
    @app.get("/api/database/repair")
    def database_repair():
        init_db_safely()
        if DB_INIT_ERROR:
            return jsonify({"ok": False, "database": "mysql" if IS_MYSQL else "sqlite", "message": DB_INIT_ERROR}), 500
        return jsonify({"ok": True, "database": "mysql" if IS_MYSQL else "sqlite", "summary": database_counts()})

    @app.get("/api/search")
    def global_search():
        query = request.args.get("q", "").strip()
        if len(query) < 2:
            return jsonify({"students": [], "staff": [], "baskets": [], "meals": []})

        like_query = f"%{query}%"
        students_rows = query_all(
            """
            SELECT id, name, email, student_id AS studentId, hostel, room, course, level, phone, status
            FROM users
            WHERE role = 'student' AND (name LIKE ? OR email LIKE ? OR student_id LIKE ? OR hostel LIKE ?)
            ORDER BY name
            LIMIT 8
            """,
            (like_query, like_query, like_query, like_query),
        )
        staff_rows = query_all(
            """
            SELECT id, name, email, role, status
            FROM users
            WHERE role IN ('kitchen', 'laundry', 'admin') AND (name LIKE ? OR email LIKE ? OR role LIKE ?)
            ORDER BY name
            LIMIT 8
            """,
            (like_query, like_query, like_query),
        )
        baskets = query_all(
            """
            SELECT id, basket_code AS basketCode, student_id AS studentId, status,
                   received_at AS receivedAt, estimated_finish AS estimatedFinish, notes
            FROM laundry_baskets
            WHERE basket_code LIKE ? OR student_id LIKE ? OR status LIKE ?
            ORDER BY id DESC
            LIMIT 8
            """,
            (like_query, like_query, like_query),
        )
        meals_rows = query_all(
            """
            SELECT id, type, start_time AS startTime, end_time AS endTime, menu, status
            FROM meals
            WHERE type LIKE ? OR menu LIKE ? OR status LIKE ?
            ORDER BY id
            LIMIT 8
            """,
            (like_query, like_query, like_query),
        )
        return jsonify({"students": students_rows, "staff": staff_rows, "baskets": baskets, "meals": meals_rows})

    @app.post("/api/auth/login")
    def login():
        payload = request.get_json(silent=True) or {}
        email = payload.get("email")
        password = payload.get("password")
        role = payload.get("role")

        if not email or not password or not role:
            return jsonify({"message": "Email, password, and role are required."}), 400

        user = query_one(
            """
            SELECT id, name, email, password, role, student_id AS studentId, hostel, room, course, level, phone, status
            FROM users
            WHERE email = ? AND role = ?
            """,
            (email, role),
        )

        if user is None or not (user["password"] == password or check_password_hash(user["password"], password)):
            return jsonify({"message": "Invalid login details."}), 401

        user.pop("password", None)
        return jsonify({"user": user})

    @app.post("/api/auth/request-password-reset")
    def request_password_reset():
        payload = request.get_json(silent=True) or {}
        email = payload.get("email", "").strip()
        if not email:
            return jsonify({"message": "Email is required."}), 400

        with get_connection() as conn:
            user = conn.execute("SELECT id, name, role, student_id AS studentId FROM users WHERE email = ?", (email,)).fetchone()
            if user:
                create_notification(conn, "admin", "Password reset requested", f"{user['name']} requested a password reset.")
                log_action(conn, user["role"], "requested password reset", "user", str(user["id"]))
                conn.commit()

        return jsonify({"message": "If this email exists, an admin will receive the reset request."})

    @app.get("/api/students")
    def students():
        return cached_json(
            "students",
            30,
            lambda: query_all(
                """
                SELECT id, name, email, student_id AS studentId, hostel, room, course, level, phone, status
                FROM users
                WHERE role = 'student'
                ORDER BY name
                """
            ),
        )

    @app.post("/api/students")
    def create_student():
        payload = request.get_json(silent=True) or {}
        required_fields = ["name", "email", "studentId", "hostel", "course", "level"]
        missing_fields = [field for field in required_fields if not payload.get(field)]

        if missing_fields:
            return jsonify({"message": f"Missing required fields: {', '.join(missing_fields)}."}), 400

        try:
            with get_connection() as conn:
                cursor = conn.execute(
                    """
                    INSERT INTO users (name, email, password, role, student_id, hostel, room, course, level, phone, status)
                    VALUES (?, ?, ?, 'student', ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        payload["name"],
                        payload["email"],
                        generate_password_hash(payload.get("password", "password")),
                        payload["studentId"],
                        payload["hostel"],
                        payload.get("room", ""),
                        payload["course"],
                        payload["level"],
                        payload.get("phone", ""),
                        payload.get("status", "Active"),
                    ),
                )
                conn.commit()
                student_id = cursor.lastrowid
        except DB_INTEGRITY_ERROR:
            return jsonify({"message": "A student with that email or student ID already exists."}), 409

        student = query_one(
            """
            SELECT id, name, email, student_id AS studentId, hostel, room, course, level, phone, status
            FROM users
            WHERE id = ?
            """,
            (student_id,),
        )
        return jsonify(student), 201

    @app.get("/api/staff")
    def staff():
        return cached_json(
            "staff",
            30,
            lambda: query_all(
                """
                SELECT id, name, email, role, status
                FROM users
                WHERE role IN ('kitchen', 'laundry', 'admin')
                ORDER BY role, name
                """
            ),
        )

    @app.post("/api/staff")
    def create_staff():
        payload = request.get_json(silent=True) or {}
        required_fields = ["name", "email", "role"]
        missing_fields = [field for field in required_fields if not payload.get(field)]

        if missing_fields:
            return jsonify({"message": f"Missing required fields: {', '.join(missing_fields)}."}), 400
        if payload["role"] not in ["kitchen", "laundry", "admin"]:
            return jsonify({"message": "Staff role must be kitchen, laundry, or admin."}), 400

        try:
            with get_connection() as conn:
                cursor = conn.execute(
                    """
                    INSERT INTO users (name, email, password, role, status)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        payload["name"],
                        payload["email"],
                        generate_password_hash(payload.get("password", "password")),
                        payload["role"],
                        payload.get("status", "Active"),
                    ),
                )
                log_action(conn, "admin", "created", "staff", payload["email"])
                conn.commit()
                staff_id = cursor.lastrowid
        except DB_INTEGRITY_ERROR:
            return jsonify({"message": "A staff account with that email already exists."}), 409

        row = query_one("SELECT id, name, email, role, status FROM users WHERE id = ?", (staff_id,))
        return jsonify(row), 201

    @app.put("/api/users/<int:user_id>/profile")
    def update_profile(user_id):
        payload = request.get_json(silent=True) or {}
        user = query_one("SELECT id, role, student_id AS studentId FROM users WHERE id = ?", (user_id,))
        if user is None:
            return jsonify({"message": "User not found."}), 404

        name = payload.get("name", "").strip()
        phone = payload.get("phone", "").strip()
        hostel = payload.get("hostel", "").strip()
        room = payload.get("room", "").strip()
        if not name:
            return jsonify({"message": "Name is required."}), 400

        with get_connection() as conn:
            conn.execute(
                """
                UPDATE users
                SET name = ?, phone = ?, hostel = ?, room = ?
                WHERE id = ?
                """,
                (name, phone, hostel, room, user_id),
            )
            log_action(conn, user["role"], "updated profile", "user", str(user_id))
            conn.commit()

        row = query_one(
            """
            SELECT id, name, email, role, student_id AS studentId, hostel, room, course, level, phone, status
            FROM users
            WHERE id = ?
            """,
            (user_id,),
        )
        return jsonify(row)

    @app.post("/api/users/<int:user_id>/password")
    def change_password(user_id):
        payload = request.get_json(silent=True) or {}
        current_password = payload.get("currentPassword", "")
        new_password = payload.get("newPassword", "")
        user = query_one("SELECT id, password, role FROM users WHERE id = ?", (user_id,))

        if user is None:
            return jsonify({"message": "User not found."}), 404
        if len(new_password) < 6:
            return jsonify({"message": "New password must be at least 6 characters."}), 400
        if not (user["password"] == current_password or check_password_hash(user["password"], current_password)):
            return jsonify({"message": "Current password is incorrect."}), 401

        with get_connection() as conn:
            conn.execute("UPDATE users SET password = ? WHERE id = ?", (generate_password_hash(new_password), user_id))
            log_action(conn, user["role"], "changed password", "user", str(user_id))
            conn.commit()

        return jsonify({"message": "Password updated."})

    @app.post("/api/users/<int:user_id>/reset-password")
    def reset_user_password(user_id):
        payload = request.get_json(silent=True) or {}
        new_password = payload.get("newPassword", "password")
        if len(new_password) < 6:
            return jsonify({"message": "New password must be at least 6 characters."}), 400

        with get_connection() as conn:
            user = conn.execute("SELECT id, role, student_id AS studentId, email FROM users WHERE id = ?", (user_id,)).fetchone()
            if user is None:
                return jsonify({"message": "User not found."}), 404
            conn.execute("UPDATE users SET password = ? WHERE id = ?", (generate_password_hash(new_password), user_id))
            create_notification(conn, user["role"], "Password reset", "Your password was reset by an admin.", user["studentId"])
            log_action(conn, "admin", "reset password", "user", str(user_id))
            conn.commit()

        return jsonify({"message": "Password reset."})

    @app.get("/api/users/<int:user_id>/history")
    def user_history(user_id):
        user = query_one(
            """
            SELECT id, name, email, role, student_id AS studentId, hostel, room, course, level, phone, status
            FROM users
            WHERE id = ?
            """,
            (user_id,),
        )
        if user is None:
            return jsonify({"message": "User not found."}), 404

        student_id = user.get("studentId")
        meals = []
        laundry = []
        notifications_rows = []
        if student_id:
            meals = query_all(
                """
                SELECT ms.id, m.type, m.menu, ms.scanned_at AS scannedAt
                FROM meal_scans ms
                JOIN meals m ON m.id = ms.meal_id
                WHERE ms.student_id = ?
                ORDER BY ms.id DESC
                LIMIT 20
                """,
                (student_id,),
            )
            laundry = query_all(
                """
                SELECT id, basket_code AS basketCode, status, received_at AS receivedAt, estimated_finish AS estimatedFinish, notes
                FROM laundry_baskets
                WHERE student_id = ?
                ORDER BY id DESC
                LIMIT 20
                """,
                (student_id,),
            )
            notifications_rows = query_all(
                """
                SELECT id, title, message, created_at AS createdAt, is_read AS isRead
                FROM notifications
                WHERE student_id = ?
                ORDER BY id DESC
                LIMIT 20
                """,
                (student_id,),
            )

        audits = query_all(
            """
            SELECT id, actor, action, entity_type AS entityType, entity_ref AS entityRef, created_at AS createdAt
            FROM audit_logs
            WHERE actor = ? OR entity_ref = ?
            ORDER BY id DESC
            LIMIT 20
            """,
            (user["role"], str(user_id)),
        )

        return jsonify({"user": user, "meals": meals, "laundry": laundry, "notifications": notifications_rows, "audits": audits})

    @app.put("/api/students/<int:user_id>")
    def update_student(user_id):
        payload = request.get_json(silent=True) or {}
        required_fields = ["name", "email", "studentId", "hostel", "course", "level", "status"]
        missing_fields = [field for field in required_fields if not payload.get(field)]

        if missing_fields:
            return jsonify({"message": f"Missing required fields: {', '.join(missing_fields)}."}), 400

        try:
            with get_connection() as conn:
                result = conn.execute(
                    """
                    UPDATE users
                    SET name = ?, email = ?, student_id = ?, hostel = ?, room = ?, course = ?, level = ?, phone = ?, status = ?
                    WHERE id = ? AND role = 'student'
                    """,
                    (
                        payload["name"],
                        payload["email"],
                        payload["studentId"],
                        payload["hostel"],
                        payload.get("room", ""),
                        payload["course"],
                        payload["level"],
                        payload.get("phone", ""),
                        payload["status"],
                        user_id,
                    ),
                )
                log_action(conn, "admin", "updated", "student", payload["studentId"])
                conn.commit()
        except DB_INTEGRITY_ERROR:
            return jsonify({"message": "A student with that email or student ID already exists."}), 409

        if result.rowcount == 0:
            return jsonify({"message": "Student not found."}), 404

        student = query_one(
            """
            SELECT id, name, email, student_id AS studentId, hostel, room, course, level, phone, status
            FROM users
            WHERE id = ?
            """,
            (user_id,),
        )
        return jsonify(student)

    @app.delete("/api/students/<int:user_id>")
    def delete_student(user_id):
        with get_connection() as conn:
            student = conn.execute("SELECT student_id FROM users WHERE id = ? AND role = 'student'", (user_id,)).fetchone()
            if student is None:
                return jsonify({"message": "Student not found."}), 404

            student_id = student["student_id"]
            conn.execute("DELETE FROM meal_scans WHERE student_id = ?", (student_id,))
            conn.execute("DELETE FROM laundry_baskets WHERE student_id = ?", (student_id,))
            conn.execute("DELETE FROM users WHERE id = ? AND role = 'student'", (user_id,))
            log_action(conn, "admin", "deleted", "student", student_id)
            conn.commit()

        return jsonify({"message": "Student deleted."})

    @app.get("/api/meals")
    def meals():
        return cached_json(
            "meals",
            30,
            lambda: query_all(
                """
                SELECT id, type, start_time AS startTime, end_time AS endTime, menu, status
                FROM meals
                ORDER BY id
                """
            ),
        )

    @app.post("/api/meals")
    def create_meal():
        payload = request.get_json(silent=True) or {}
        required_fields = ["type", "startTime", "endTime", "menu", "status"]
        missing_fields = [field for field in required_fields if not payload.get(field)]

        if missing_fields:
            return jsonify({"message": f"Missing required fields: {', '.join(missing_fields)}."}), 400

        with get_connection() as conn:
            cursor = conn.execute(
                "INSERT INTO meals (type, start_time, end_time, menu, status) VALUES (?, ?, ?, ?, ?)",
                (payload["type"], payload["startTime"], payload["endTime"], payload["menu"], payload["status"]),
            )
            log_action(conn, "admin", "created", "meal", payload["type"])
            conn.commit()
            meal_id = cursor.lastrowid

        meal = query_one(
            "SELECT id, type, start_time AS startTime, end_time AS endTime, menu, status FROM meals WHERE id = ?",
            (meal_id,),
        )
        return jsonify(meal), 201

    @app.put("/api/meals/<int:meal_id>")
    def update_meal(meal_id):
        payload = request.get_json(silent=True) or {}
        required_fields = ["type", "startTime", "endTime", "menu", "status"]
        missing_fields = [field for field in required_fields if not payload.get(field)]

        if missing_fields:
            return jsonify({"message": f"Missing required fields: {', '.join(missing_fields)}."}), 400

        with get_connection() as conn:
            result = conn.execute(
                """
                UPDATE meals
                SET type = ?, start_time = ?, end_time = ?, menu = ?, status = ?
                WHERE id = ?
                """,
                (payload["type"], payload["startTime"], payload["endTime"], payload["menu"], payload["status"], meal_id),
            )
            log_action(conn, "admin", "updated", "meal", payload["type"])
            conn.commit()

        if result.rowcount == 0:
            return jsonify({"message": "Meal not found."}), 404

        meal = query_one(
            "SELECT id, type, start_time AS startTime, end_time AS endTime, menu, status FROM meals WHERE id = ?",
            (meal_id,),
        )
        return jsonify(meal)

    @app.delete("/api/meals/<int:meal_id>")
    def delete_meal(meal_id):
        with get_connection() as conn:
            conn.execute("DELETE FROM meal_scans WHERE meal_id = ?", (meal_id,))
            result = conn.execute("DELETE FROM meals WHERE id = ?", (meal_id,))
            log_action(conn, "admin", "deleted", "meal", str(meal_id))
            conn.commit()

        if result.rowcount == 0:
            return jsonify({"message": "Meal not found."}), 404

        return jsonify({"message": "Meal deleted."})

    @app.get("/api/laundry/baskets")
    def laundry_baskets():
        return cached_json(
            "laundry_baskets",
            20,
            lambda: query_all(
                """
                SELECT id, basket_code AS basketCode, student_id AS studentId, status,
                       received_at AS receivedAt, estimated_finish AS estimatedFinish, notes
                FROM laundry_baskets
                ORDER BY id DESC
                """
            ),
        )

    @app.patch("/api/laundry/baskets/<int:basket_id>/status")
    def update_laundry_basket_status(basket_id):
        payload = request.get_json(silent=True) or {}
        status = payload.get("status")
        staff_name = payload.get("staffName", "Laundry Staff")

        if status not in ["Pending Approval", "Pending", "Washing", "Ready", "Picked Up"]:
            return jsonify({"message": "Invalid basket status."}), 400

        with get_connection() as conn:
            basket = conn.execute(
                "SELECT basket_code AS basketCode, student_id AS studentId FROM laundry_baskets WHERE id = ?",
                (basket_id,),
            ).fetchone()
            if basket is None:
                return jsonify({"message": "Basket not found."}), 404

            result = conn.execute("UPDATE laundry_baskets SET status = ? WHERE id = ?", (status, basket_id))
            conn.execute(
                "INSERT INTO laundry_activity (basket_code, action, staff_name, activity_time) VALUES (?, ?, ?, ?)",
                (basket["basketCode"], f"Moved to {status}", staff_name, "Now"),
            )
            create_notification(
                conn,
                "student",
                "Laundry status updated",
                f"Basket #{basket['basketCode']} is now {status}.",
                basket["studentId"],
            )
            log_action(conn, "laundry", "updated status", "basket", basket["basketCode"])
            conn.commit()

        if result.rowcount == 0:
            return jsonify({"message": "Basket not found."}), 404

        updated = query_one(
            """
            SELECT id, basket_code AS basketCode, student_id AS studentId, status,
                   received_at AS receivedAt, estimated_finish AS estimatedFinish, notes
            FROM laundry_baskets
            WHERE id = ?
            """,
            (basket_id,),
        )
        return jsonify(updated)

    @app.post("/api/laundry/baskets")
    def create_laundry_basket():
        payload = request.get_json(silent=True) or {}
        required_fields = ["basketCode", "studentId", "status", "receivedAt"]
        missing_fields = [field for field in required_fields if not payload.get(field)]

        if missing_fields:
            return jsonify({"message": f"Missing required fields: {', '.join(missing_fields)}."}), 400

        try:
            with get_connection() as conn:
                cursor = conn.execute(
                    """
                    INSERT INTO laundry_baskets (basket_code, student_id, status, received_at, estimated_finish, notes)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        payload["basketCode"],
                        payload["studentId"],
                        payload["status"],
                        payload["receivedAt"],
                        payload.get("estimatedFinish"),
                        payload.get("notes"),
                    ),
                )
                conn.execute(
                    """
                    INSERT INTO laundry_activity (basket_code, action, staff_name, activity_time)
                    VALUES (?, ?, ?, ?)
                    """,
                    (
                        payload["basketCode"],
                        "Received",
                        payload.get("staffName", "Laundry Staff"),
                        payload["receivedAt"],
                    ),
                )
                create_notification(
                    conn,
                    "student",
                    "Laundry received",
                    f"Basket #{payload['basketCode']} has been received by laundry.",
                    payload["studentId"],
                )
                log_action(conn, "laundry", "created", "basket", payload["basketCode"])
                conn.commit()
                basket_id = cursor.lastrowid
        except DB_INTEGRITY_ERROR:
            return jsonify({"message": "A basket with that basket ID already exists."}), 409

        basket = query_one(
            """
            SELECT id, basket_code AS basketCode, student_id AS studentId, status,
                   received_at AS receivedAt, estimated_finish AS estimatedFinish, notes
            FROM laundry_baskets
            WHERE id = ?
            """,
            (basket_id,),
        )
        return jsonify(basket), 201

    @app.put("/api/laundry/baskets/<int:basket_id>")
    def update_laundry_basket(basket_id):
        payload = request.get_json(silent=True) or {}
        required_fields = ["basketCode", "studentId", "status", "receivedAt"]
        missing_fields = [field for field in required_fields if not payload.get(field)]

        if missing_fields:
            return jsonify({"message": f"Missing required fields: {', '.join(missing_fields)}."}), 400

        try:
            with get_connection() as conn:
                result = conn.execute(
                    """
                    UPDATE laundry_baskets
                    SET basket_code = ?, student_id = ?, status = ?, received_at = ?, estimated_finish = ?, notes = ?
                    WHERE id = ?
                    """,
                    (
                        payload["basketCode"],
                        payload["studentId"],
                        payload["status"],
                        payload["receivedAt"],
                        payload.get("estimatedFinish"),
                        payload.get("notes"),
                        basket_id,
                    ),
                )
                conn.execute(
                    """
                    INSERT INTO laundry_activity (basket_code, action, staff_name, activity_time)
                    VALUES (?, ?, ?, ?)
                    """,
                    (
                        payload["basketCode"],
                        f"Status Updated to {payload['status']}",
                        payload.get("staffName", "Laundry Staff"),
                        payload["receivedAt"],
                    ),
                )
                create_notification(
                    conn,
                    "student",
                    "Laundry status updated",
                    f"Basket #{payload['basketCode']} is now {payload['status']}.",
                    payload["studentId"],
                )
                log_action(conn, "laundry", "updated", "basket", payload["basketCode"])
                conn.commit()
        except DB_INTEGRITY_ERROR:
            return jsonify({"message": "A basket with that basket ID already exists."}), 409

        if result.rowcount == 0:
            return jsonify({"message": "Basket not found."}), 404

        basket = query_one(
            """
            SELECT id, basket_code AS basketCode, student_id AS studentId, status,
                   received_at AS receivedAt, estimated_finish AS estimatedFinish, notes
            FROM laundry_baskets
            WHERE id = ?
            """,
            (basket_id,),
        )
        return jsonify(basket)

    @app.delete("/api/laundry/baskets/<int:basket_id>")
    def delete_laundry_basket(basket_id):
        with get_connection() as conn:
            result = conn.execute("DELETE FROM laundry_baskets WHERE id = ?", (basket_id,))
            log_action(conn, "laundry", "deleted", "basket", str(basket_id))
            conn.commit()

        if result.rowcount == 0:
            return jsonify({"message": "Basket not found."}), 404

        return jsonify({"message": "Basket deleted."})

    @app.post("/api/student/<student_id>/laundry-request")
    def request_laundry(student_id):
        payload = request.get_json(silent=True) or {}
        basket_code = payload.get("basketCode") or f"REQ{student_id[-4:]}"
        received_at = payload.get("receivedAt", "Requested now")

        try:
            with get_connection() as conn:
                cursor = conn.execute(
                    """
                    INSERT INTO laundry_baskets (basket_code, student_id, status, received_at, estimated_finish, notes)
                    VALUES (?, ?, 'Pending Approval', ?, ?, ?)
                    """,
                    (basket_code, student_id, received_at, payload.get("estimatedFinish"), payload.get("notes", "Student laundry request")),
                )
                conn.execute(
                    "INSERT INTO laundry_activity (basket_code, action, staff_name, activity_time) VALUES (?, 'Pending Approval', ?, ?)",
                    (basket_code, "Student", received_at),
                )
                create_notification(conn, "laundry", "New student laundry request", f"Student {student_id} requested basket #{basket_code}.")
                log_action(conn, "student", "requested", "basket", basket_code)
                conn.commit()
                basket_id = cursor.lastrowid
        except DB_INTEGRITY_ERROR:
            return jsonify({"message": "That basket ID already exists."}), 409

        basket = query_one(
            """
            SELECT id, basket_code AS basketCode, student_id AS studentId, status,
                   received_at AS receivedAt, estimated_finish AS estimatedFinish, notes
            FROM laundry_baskets WHERE id = ?
            """,
            (basket_id,),
        )
        return jsonify(basket), 201

    @app.get("/api/notifications")
    def notifications():
        role = request.args.get("role", "")
        student_id = request.args.get("studentId")
        cache_key = f"notifications:{role}:{student_id or ''}"
        def load_notifications():
            if student_id:
                return query_all(
                    """
                    SELECT id, user_role AS userRole, student_id AS studentId, title, message, created_at AS createdAt, is_read AS isRead
                    FROM notifications
                    WHERE user_role = ? AND student_id = ?
                    ORDER BY id DESC
                    LIMIT 10
                    """,
                    (role, student_id),
                )
            return query_all(
                """
                SELECT id, user_role AS userRole, student_id AS studentId, title, message, created_at AS createdAt, is_read AS isRead
                FROM notifications
                WHERE user_role = ?
                ORDER BY id DESC
                LIMIT 10
                """,
                (role,),
            )

        return cached_json(cache_key, 8, load_notifications)

        if student_id:
            rows = query_all(
                """
                SELECT id, user_role AS userRole, student_id AS studentId, title, message, created_at AS createdAt, is_read AS isRead
                FROM notifications
                WHERE user_role = ? AND student_id = ?
                ORDER BY id DESC
                LIMIT 10
                """,
                (role, student_id),
            )
        else:
            rows = query_all(
                """
                SELECT id, user_role AS userRole, student_id AS studentId, title, message, created_at AS createdAt, is_read AS isRead
                FROM notifications
                WHERE user_role = ?
                ORDER BY id DESC
                LIMIT 10
                """,
                (role,),
            )
        return jsonify(rows)

    @app.patch("/api/notifications/<int:notification_id>/read")
    def mark_notification_read(notification_id):
        with get_connection() as conn:
            result = conn.execute("UPDATE notifications SET is_read = 1 WHERE id = ?", (notification_id,))
            conn.commit()

        if result.rowcount == 0:
            return jsonify({"message": "Notification not found."}), 404
        return jsonify({"message": "Notification marked as read."})

    @app.patch("/api/notifications/read-all")
    def mark_notifications_read():
        payload = request.get_json(silent=True) or {}
        role = payload.get("role", "")
        student_id = payload.get("studentId")

        with get_connection() as conn:
            if student_id:
                conn.execute("UPDATE notifications SET is_read = 1 WHERE user_role = ? AND student_id = ?", (role, student_id))
            else:
                conn.execute("UPDATE notifications SET is_read = 1 WHERE user_role = ?", (role,))
            conn.commit()

        return jsonify({"message": "Notifications marked as read."})

    @app.get("/api/audit-logs")
    def audit_logs():
        return cached_json(
            "audit_logs",
            15,
            lambda: query_all(
                """
                SELECT id, actor, action, entity_type AS entityType, entity_ref AS entityRef, created_at AS createdAt
                FROM audit_logs
                ORDER BY id DESC
                LIMIT 50
                """
            ),
        )

    @app.get("/api/export/<kind>")
    def export_csv(kind):
        export_map = {
            "students": ("students.csv", ["name", "studentId", "email", "hostel", "status"], query_all("SELECT name, student_id AS studentId, email, hostel, status FROM users WHERE role = 'student' ORDER BY name")),
            "meals": ("meals.csv", ["type", "startTime", "endTime", "menu", "status"], query_all("SELECT type, start_time AS startTime, end_time AS endTime, menu, status FROM meals ORDER BY id")),
            "baskets": ("laundry-baskets.csv", ["basketCode", "studentId", "status", "receivedAt"], query_all("SELECT basket_code AS basketCode, student_id AS studentId, status, received_at AS receivedAt FROM laundry_baskets ORDER BY id DESC")),
            "audits": ("audit-logs.csv", ["actor", "action", "entityType", "entityRef", "createdAt"], query_all("SELECT actor, action, entity_type AS entityType, entity_ref AS entityRef, created_at AS createdAt FROM audit_logs ORDER BY id DESC")),
        }
        if kind not in export_map:
            return jsonify({"message": "Unknown export type."}), 404

        filename, headers, rows = export_map[kind]
        csv_lines = [",".join(headers)]
        for row in rows:
            csv_lines.append(",".join(f'"{str(row.get(header, "")).replace(chr(34), chr(34) + chr(34))}"' for header in headers))

        return Response(
            "\n".join(csv_lines),
            mimetype="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    @app.get("/api/admin/dashboard")
    def admin_dashboard():
        def load_admin_dashboard():
            stats = {
                "totalStudents": query_one("SELECT COUNT(*) AS count FROM users WHERE role = 'student'")["count"],
                "mealsServedToday": table_count_value("meal_scans"),
                "laundryBaskets": table_count_value("laundry_baskets"),
                "systemUptime": "99.9%",
            }
            alerts = query_all(
                """
                SELECT id, alert_type AS alertType, message, alert_time AS alertTime
                FROM system_alerts
                ORDER BY id DESC
                LIMIT 5
                """
            )
            return {"stats": stats, "alerts": alerts}

        return cached_json("admin_dashboard", 15, load_admin_dashboard)

        stats = {
            "totalStudents": query_one("SELECT COUNT(*) AS count FROM users WHERE role = 'student'")["count"],
            "mealsServedToday": table_count_value("meal_scans"),
            "laundryBaskets": table_count_value("laundry_baskets"),
            "systemUptime": "99.9%",
        }
        alerts = query_all(
            """
            SELECT id, alert_type AS alertType, message, alert_time AS alertTime
            FROM system_alerts
            ORDER BY id DESC
            LIMIT 5
            """
        )
        return jsonify({"stats": stats, "alerts": alerts})

    @app.get("/api/admin/control-center")
    def admin_control_center():
        def load_control_center():
            dashboard = admin_dashboard().get_json()
            pending_baskets = query_all(
                """
                SELECT id, basket_code AS basketCode, student_id AS studentId, status,
                       received_at AS receivedAt, estimated_finish AS estimatedFinish, notes
                FROM laundry_baskets
                WHERE status = 'Pending Approval'
                ORDER BY id DESC
                LIMIT 8
                """
            )
            audits = query_all(
                """
                SELECT id, actor, action, entity_type AS entityType, entity_ref AS entityRef, created_at AS createdAt
                FROM audit_logs
                ORDER BY id DESC
                LIMIT 6
                """
            )
            return {"dashboard": dashboard, "pendingBaskets": pending_baskets, "audits": audits}

        return cached_json("admin_control_center", 15, load_control_center)

    @app.get("/api/kitchen/dashboard")
    def kitchen_dashboard():
        def load_kitchen_dashboard():
            current_meal = query_one(
                """
                SELECT id, type, start_time AS startTime, end_time AS endTime, menu, status
                FROM meals
                WHERE status = 'Active'
                ORDER BY id
                LIMIT 1
                """
            )
            recent_scans = query_all(
                """
                SELECT id, student_id AS studentId, meal_type AS mealType, scanned_time AS scannedTime, status
                FROM kitchen_scan_logs
                ORDER BY id DESC
                LIMIT 10
                """
            )
            total_expected = query_one("SELECT COUNT(*) AS count FROM users WHERE role = 'student'")["count"] * 3
            total_served = query_one("SELECT COUNT(*) AS count FROM meal_scans")["count"] + table_count_value("kitchen_scan_logs")
            return {
                "currentMeal": current_meal,
                "stats": {
                    "totalExpected": total_expected,
                    "totalServed": total_served,
                },
                "recentScans": recent_scans,
            }

        return cached_json("kitchen_dashboard", 10, load_kitchen_dashboard)

        current_meal = query_one(
            """
            SELECT id, type, start_time AS startTime, end_time AS endTime, menu, status
            FROM meals
            WHERE status = 'Active'
            ORDER BY id
            LIMIT 1
            """
        )
        recent_scans = query_all(
            """
            SELECT id, student_id AS studentId, meal_type AS mealType, scanned_time AS scannedTime, status
            FROM kitchen_scan_logs
            ORDER BY id DESC
            LIMIT 10
            """
        )
        total_expected = query_one("SELECT COUNT(*) AS count FROM users WHERE role = 'student'")["count"] * 3
        total_served = query_one("SELECT COUNT(*) AS count FROM meal_scans")["count"] + table_count_value("kitchen_scan_logs")

        return jsonify(
            {
                "currentMeal": current_meal,
                "stats": {
                    "totalExpected": total_expected,
                    "totalServed": total_served,
                },
                "recentScans": recent_scans,
            }
        )

    @app.get("/api/laundry/dashboard")
    def laundry_dashboard():
        def load_laundry_dashboard():
            status_counts = {
                "pending": query_one("SELECT COUNT(*) AS count FROM laundry_baskets WHERE status IN ('Pending', 'Pending Approval')")["count"],
                "washing": query_one("SELECT COUNT(*) AS count FROM laundry_baskets WHERE status = 'Washing'")["count"],
                "ready": query_one("SELECT COUNT(*) AS count FROM laundry_baskets WHERE status = 'Ready'")["count"],
                "issues": query_one("SELECT COUNT(*) AS count FROM laundry_activity WHERE action = 'Issue Reported'")["count"],
            }
            activity = query_all(
                """
                SELECT id, basket_code AS basketCode, action, staff_name AS staffName, activity_time AS activityTime
                FROM laundry_activity
                ORDER BY id DESC
                LIMIT 10
                """
            )
            return {"statusCounts": status_counts, "activity": activity}

        return cached_json("laundry_dashboard", 10, load_laundry_dashboard)

        status_counts = {
            "pending": query_one("SELECT COUNT(*) AS count FROM laundry_baskets WHERE status IN ('Pending', 'Pending Approval')")["count"],
            "washing": query_one("SELECT COUNT(*) AS count FROM laundry_baskets WHERE status = 'Washing'")["count"],
            "ready": query_one("SELECT COUNT(*) AS count FROM laundry_baskets WHERE status = 'Ready'")["count"],
            "issues": query_one("SELECT COUNT(*) AS count FROM laundry_activity WHERE action = 'Issue Reported'")["count"],
        }
        activity = query_all(
            """
            SELECT id, basket_code AS basketCode, action, staff_name AS staffName, activity_time AS activityTime
            FROM laundry_activity
            ORDER BY id DESC
            LIMIT 10
            """
        )
        return jsonify({"statusCounts": status_counts, "activity": activity})

    @app.get("/api/laundry/reports")
    def laundry_reports():
        def load_laundry_reports():
            reports = query_all(
                """
                SELECT id, report_period AS reportPeriod, total_baskets_processed AS totalBasketsProcessed,
                       average_turnaround AS averageTurnaround, reported_issues AS reportedIssues
                FROM laundry_reports
                ORDER BY id
                """
            )
            machines = query_all(
                """
                SELECT id, name, machine_type AS machineType, usage_percent AS usagePercent, status
                FROM laundry_machines
                ORDER BY id
                """
            )
            return {"reports": reports, "machines": machines}

        return cached_json("laundry_reports", 60, load_laundry_reports)

        reports = query_all(
            """
            SELECT id, report_period AS reportPeriod, total_baskets_processed AS totalBasketsProcessed,
                   average_turnaround AS averageTurnaround, reported_issues AS reportedIssues
            FROM laundry_reports
            ORDER BY id
            """
        )
        machines = query_all(
            """
            SELECT id, name, machine_type AS machineType, usage_percent AS usagePercent, status
            FROM laundry_machines
            ORDER BY id
            """
        )
        return jsonify({"reports": reports, "machines": machines})

    @app.get("/api/admin/analytics")
    def admin_analytics():
        def load_admin_analytics():
            meal_trends = query_all(
                """
                SELECT id, day_label AS dayLabel, attendance_count AS attendanceCount
                FROM analytics_meal_trends
                ORDER BY id
                """
            )
            kpis = query_all("SELECT id, name, value, delta FROM analytics_kpis ORDER BY id")
            machine_average = query_one(
                "SELECT ROUND(AVG(usage_percent), 0) AS average FROM laundry_machines WHERE status = 'Active'"
            )["average"]
            return {"mealTrends": meal_trends, "machineUtilizationAverage": machine_average, "kpis": kpis}

        return cached_json("admin_analytics", 60, load_admin_analytics)

        meal_trends = query_all(
            """
            SELECT id, day_label AS dayLabel, attendance_count AS attendanceCount
            FROM analytics_meal_trends
            ORDER BY id
            """
        )
        kpis = query_all("SELECT id, name, value, delta FROM analytics_kpis ORDER BY id")
        machine_average = query_one(
            "SELECT ROUND(AVG(usage_percent), 0) AS average FROM laundry_machines WHERE status = 'Active'"
        )["average"]
        return jsonify({"mealTrends": meal_trends, "machineUtilizationAverage": machine_average, "kpis": kpis})

    @app.get("/api/admin/alerts")
    def admin_alerts():
        alerts = query_all(
            """
            SELECT id, alert_type AS alertType, message, alert_time AS alertTime
            FROM system_alerts
            ORDER BY id DESC
            """
        )
        return jsonify(alerts)

    @app.get("/api/database/summary")
    def database_summary():
        return cached_json("database_summary", 20, database_counts)

    @app.get("/api/student/<student_id>/overview")
    def student_overview(student_id):
        def load_student_overview():
            student = query_one(
                """
                SELECT id, name, email, student_id AS studentId, hostel, room, course, level, phone, status
                FROM users
                WHERE role = 'student' AND student_id = ?
                """,
                (student_id,),
            )

            if student is None:
                return None

            meals = query_all(
                """
                SELECT m.id, m.type, m.start_time AS startTime, m.end_time AS endTime, m.menu, m.status,
                       CASE WHEN ms.id IS NULL THEN 0 ELSE 1 END AS consumed,
                       ms.scanned_at AS scannedAt
                FROM meals m
                LEFT JOIN meal_scans ms ON ms.meal_id = m.id AND ms.student_id = ?
                ORDER BY m.id
                """,
                (student_id,),
            )

            laundry = query_all(
                """
                SELECT id, basket_code AS basketCode, student_id AS studentId, status,
                       received_at AS receivedAt, estimated_finish AS estimatedFinish, notes
                FROM laundry_baskets
                WHERE student_id = ?
                ORDER BY id DESC
                """,
                (student_id,),
            )
            return {"student": student, "meals": meals, "laundry": laundry}

        overview = RESPONSE_CACHE.get(f"student_overview:{student_id}")
        if overview and overview["expires_at"] > time.time():
            if overview["value"] is None:
                return jsonify({"message": "Student not found."}), 404
            return jsonify(overview["value"])
        value = load_student_overview()
        RESPONSE_CACHE[f"student_overview:{student_id}"] = {"expires_at": time.time() + 10, "value": value}
        if value is None:
            return jsonify({"message": "Student not found."}), 404
        return jsonify(value)

        student = query_one(
            """
            SELECT id, name, email, student_id AS studentId, hostel, room, course, level, phone, status
            FROM users
            WHERE role = 'student' AND student_id = ?
            """,
            (student_id,),
        )

        if student is None:
            return jsonify({"message": "Student not found."}), 404

        meals = query_all(
            """
            SELECT m.id, m.type, m.start_time AS startTime, m.end_time AS endTime, m.menu, m.status,
                   CASE WHEN ms.id IS NULL THEN 0 ELSE 1 END AS consumed,
                   ms.scanned_at AS scannedAt
            FROM meals m
            LEFT JOIN meal_scans ms ON ms.meal_id = m.id AND ms.student_id = ?
            ORDER BY m.id
            """,
            (student_id,),
        )

        laundry = query_all(
            """
            SELECT id, basket_code AS basketCode, student_id AS studentId, status,
                   received_at AS receivedAt, estimated_finish AS estimatedFinish, notes
            FROM laundry_baskets
            WHERE student_id = ?
            ORDER BY id DESC
            """,
            (student_id,),
        )

        return jsonify({"student": student, "meals": meals, "laundry": laundry})

    @app.post("/api/meals/<int:meal_id>/scan")
    def scan_meal(meal_id):
        payload = request.get_json(silent=True) or {}
        student_id = payload.get("studentId")

        if not student_id:
            return jsonify({"message": "Student ID and meal ID are required."}), 400

        meal = query_one("SELECT id, type FROM meals WHERE id = ?", (meal_id,))
        if meal is None:
            return jsonify({"message": "Meal not found."}), 404
        student = query_one(
            """
            SELECT id, name, email, student_id AS studentId, hostel, room, course, level, phone, status
            FROM users
            WHERE role = 'student' AND student_id = ?
            """,
            (student_id,),
        )
        if student is None:
            return jsonify({"message": "Student not found."}), 404
        if student["status"] != "Active":
            with get_connection() as conn:
                conn.execute(
                    """
                    INSERT INTO kitchen_scan_logs (student_id, meal_type, scanned_time, status)
                    VALUES (?, ?, ?, ?)
                    """,
                    (student_id, meal["type"], "Now", "Denied (Inactive Student)"),
                )
                log_action(conn, "kitchen", "denied inactive student", "meal", f"{student_id}:{meal['type']}")
                conn.commit()
            return jsonify({"message": f"{student['name']} is inactive and cannot be approved."}), 403

        existing = query_one("SELECT id FROM meal_scans WHERE student_id = ? AND meal_id = ?", (student_id, meal_id))
        if existing is not None:
            with get_connection() as conn:
                conn.execute(
                    """
                    INSERT INTO kitchen_scan_logs (student_id, meal_type, scanned_time, status)
                    VALUES (?, ?, ?, ?)
                    """,
                    (student_id, meal["type"], "Now", "Denied (Already Scanned)"),
                )
                log_action(conn, "kitchen", "denied duplicate scan", "meal", f"{student_id}:{meal['type']}")
                conn.commit()
            return jsonify({"message": f"Already scanned for {meal['type']}."}), 409

        with get_connection() as conn:
            conn.execute("INSERT INTO meal_scans (student_id, meal_id) VALUES (?, ?)", (student_id, meal_id))
            conn.execute(
                """
                INSERT INTO kitchen_scan_logs (student_id, meal_type, scanned_time, status)
                VALUES (?, ?, ?, ?)
                """,
                (student_id, meal["type"], "Now", "Success"),
            )
            create_notification(conn, "student", "Meal approved", f"Your {meal['type']} scan was approved.", student_id)
            log_action(conn, "kitchen", "approved scan", "meal", f"{student_id}:{meal['type']}")
            conn.commit()

        return jsonify({"message": "Meal approved.", "studentId": student_id, "meal": meal, "student": student}), 201

    @app.get("/")
    def serve_frontend_index():
        if not STATIC_DIR.exists():
            return jsonify({"message": "Frontend build not found. Run npm run build first."}), 404
        return send_from_directory(STATIC_DIR, "index.html")

    @app.get("/<path:path>")
    def serve_frontend(path):
        if STATIC_DIR.exists() and (STATIC_DIR / path).is_file():
            return send_from_directory(STATIC_DIR, path)
        if STATIC_DIR.exists():
            return send_from_directory(STATIC_DIR, "index.html")
        return jsonify({"message": "Frontend build not found. Run npm run build first."}), 404

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.environ.get("API_PORT", "4000"))
    app.run(host="0.0.0.0", port=port, debug=True)
