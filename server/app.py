import os
import queue
import sqlite3
import time
import base64
import csv
import hashlib
import hmac
import io
import json
import secrets
from pathlib import Path
from functools import wraps
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
JWT_SECRET = os.environ.get("SECRET_KEY", "hams-development-secret-change-me")
TOKEN_TTL_SECONDS = int(os.environ.get("TOKEN_TTL_SECONDS", "86400"))


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


def _b64url_encode(value):
    raw = value if isinstance(value, bytes) else json.dumps(value, separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _b64url_decode(value):
    padded = value + "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(padded.encode())


def create_token(user):
    now = int(time.time())
    payload = {
        "sub": user["id"],
        "role": user["role"],
        "studentId": user.get("studentId"),
        "name": user["name"],
        "iat": now,
        "exp": now + TOKEN_TTL_SECONDS,
    }
    header = {"alg": "HS256", "typ": "JWT"}
    signing_input = f"{_b64url_encode(header)}.{_b64url_encode(payload)}"
    signature = hmac.new(JWT_SECRET.encode(), signing_input.encode(), hashlib.sha256).digest()
    return f"{signing_input}.{_b64url_encode(signature)}"


def verify_token(token):
    try:
        header_part, payload_part, signature_part = token.split(".")
        signing_input = f"{header_part}.{payload_part}"
        expected = hmac.new(JWT_SECRET.encode(), signing_input.encode(), hashlib.sha256).digest()
        actual = _b64url_decode(signature_part)
        if not hmac.compare_digest(expected, actual):
            return None
        payload = json.loads(_b64url_decode(payload_part))
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


def current_user():
    return getattr(g, "current_user", None)


def require_roles(*roles):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            user = current_user()
            if not user:
                return jsonify({"message": "Authentication required."}), 401
            if roles and user.get("role") not in roles:
                return jsonify({"message": "You do not have permission to do this."}), 403
            return func(*args, **kwargs)
        return wrapper
    return decorator


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
              photo_url TEXT,
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

            CREATE TABLE IF NOT EXISTS user_preferences (
              user_id INTEGER PRIMARY KEY,
              theme VARCHAR(50) NOT NULL DEFAULT 'system',
              dashboard_layout VARCHAR(50) NOT NULL DEFAULT 'comfortable',
              table_filters TEXT,
              last_selected_meal INTEGER,
              notification_settings TEXT,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS password_reset_tokens (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              token_hash VARCHAR(255) NOT NULL UNIQUE,
              expires_at INTEGER NOT NULL,
              used_at TIMESTAMP,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS laundry_issues (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              basket_id INTEGER NOT NULL,
              basket_code VARCHAR(255) NOT NULL,
              student_id VARCHAR(255) NOT NULL,
              issue_type VARCHAR(255) NOT NULL,
              notes TEXT,
              status VARCHAR(50) NOT NULL DEFAULT 'Open',
              reported_by VARCHAR(255) NOT NULL,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              resolved_at TIMESTAMP,
              FOREIGN KEY (basket_id) REFERENCES laundry_baskets(id)
            );

            CREATE TABLE IF NOT EXISTS approval_requests (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              request_type VARCHAR(255) NOT NULL,
              entity_type VARCHAR(255) NOT NULL,
              entity_ref VARCHAR(255),
              requested_by VARCHAR(255) NOT NULL,
              status VARCHAR(50) NOT NULL DEFAULT 'Pending',
              notes TEXT,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              decided_by VARCHAR(255),
              decided_at TIMESTAMP
            );
            """
        )

        user_columns = table_columns(conn, "users")
        if "room" not in user_columns:
            conn.execute("ALTER TABLE users ADD COLUMN room VARCHAR(255)")
        if "photo_url" not in user_columns:
            conn.execute("ALTER TABLE users ADD COLUMN photo_url TEXT")

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


def pagination_args(default_page_size=20, max_page_size=100):
    page = max(int(request.args.get("page", "1") or 1), 1)
    page_size = min(max(int(request.args.get("pageSize", str(default_page_size)) or default_page_size), 1), max_page_size)
    offset = (page - 1) * page_size
    return page, page_size, offset


def paginated_response(rows, total, page, page_size):
    return jsonify({"items": rows, "page": page, "pageSize": page_size, "total": total, "totalPages": max((total + page_size - 1) // page_size, 1)})


def log_action(conn, actor, action, entity_type, entity_ref=None):
    conn.execute(
        "INSERT INTO audit_logs (actor, action, entity_type, entity_ref) VALUES (?, ?, ?, ?)",
        (actor, action, entity_type, entity_ref),
    )


def create_notification(conn, user_role, title, message, student_id=None):
    if student_id:
        user = conn.execute("SELECT id FROM users WHERE student_id = ?", (student_id,)).fetchone()
        if user:
            prefs = conn.execute("SELECT notification_settings AS notificationSettings FROM user_preferences WHERE user_id = ?", (user["id"],)).fetchone()
            if prefs and prefs["notificationSettings"]:
                settings = json.loads(prefs["notificationSettings"] or "{}")
                title_text = title.lower()
                category = "admin"
                if "laundry" in title_text or "basket" in title_text:
                    category = "laundry"
                elif "meal" in title_text or "scan" in title_text:
                    category = "meals"
                elif "password" in title_text:
                    category = "password"
                if settings.get(category) is False:
                    return
    conn.execute(
        """
        INSERT INTO notifications (user_role, student_id, title, message)
        VALUES (?, ?, ?, ?)
        """,
        (user_role, student_id, title, message),
    )


def user_public_row(user_id):
    return query_one(
        """
        SELECT id, name, email, role, student_id AS studentId, hostel, room, course, level, phone, photo_url AS photoUrl, status
        FROM users
        WHERE id = ?
        """,
        (user_id,),
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

    @app.before_request
    def authenticate_api_request():
        if request.method == "OPTIONS" or not request.path.startswith("/api/"):
            return None

        public_paths = (
            "/api/health",
            "/api/database/health",
            "/api/auth/login",
            "/api/auth/request-password-reset",
            "/api/auth/reset-password",
        )
        if request.path in public_paths:
            return None

        auth_header = request.headers.get("Authorization", "")
        token = auth_header.replace("Bearer ", "", 1).strip() if auth_header.startswith("Bearer ") else ""
        payload = verify_token(token)
        if payload is None:
            return jsonify({"message": "Authentication required."}), 401
        g.current_user = payload

        role = payload.get("role")
        path = request.path

        if path.startswith(("/api/admin", "/api/students", "/api/staff", "/api/audit", "/api/export", "/api/database/summary", "/api/database/repair", "/api/database/backup", "/api/database/restore")) and role != "admin":
            return jsonify({"message": "Admin access required."}), 403
        if path.startswith("/api/laundry") and role not in ("laundry", "admin"):
            return jsonify({"message": "Laundry access required."}), 403
        if path.startswith("/api/kitchen") and role not in ("kitchen", "admin"):
            return jsonify({"message": "Kitchen access required."}), 403
        if path.startswith("/api/meals/") and path.endswith("/scan") and role not in ("kitchen", "admin"):
            return jsonify({"message": "Kitchen access required."}), 403
        if path == "/api/meals" and request.method != "GET" and role != "admin":
            return jsonify({"message": "Admin access required."}), 403
        if path.startswith("/api/student/") and role == "student":
            requested_student = path.split("/")[3]
            if requested_student != str(payload.get("studentId")):
                return jsonify({"message": "Students can only access their own records."}), 403

        return None

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
            SELECT id, name, email, student_id AS studentId, hostel, room, course, level, phone, photo_url AS photoUrl, status
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
            SELECT id, name, email, password, role, student_id AS studentId, hostel, room, course, level, phone, photo_url AS photoUrl, status
            FROM users
            WHERE email = ? AND role = ?
            """,
            (email, role),
        )

        if user is None or not (user["password"] == password or check_password_hash(user["password"], password)):
            with get_connection() as conn:
                log_action(conn, "unknown", "failed login", "user", email)
                conn.commit()
            return jsonify({"message": "Invalid login details."}), 401

        user.pop("password", None)
        token = create_token(user)
        with get_connection() as conn:
            log_action(conn, user["name"], f"logged in from {request.remote_addr or 'unknown'}", "user", str(user["id"]))
            conn.commit()
        return jsonify({"user": user, "token": token})

    @app.post("/api/auth/request-password-reset")
    def request_password_reset():
        payload = request.get_json(silent=True) or {}
        email = payload.get("email", "").strip()
        if not email:
            return jsonify({"message": "Email is required."}), 400

        reset_token = None
        with get_connection() as conn:
            user = conn.execute("SELECT id, name, role, student_id AS studentId FROM users WHERE email = ?", (email,)).fetchone()
            if user:
                raw_token = secrets.token_urlsafe(32)
                token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
                expires_at = int(time.time()) + 3600
                conn.execute(
                    "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
                    (user["id"], token_hash, expires_at),
                )
                conn.execute(
                    """
                    INSERT INTO approval_requests (request_type, entity_type, entity_ref, requested_by, notes)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    ("Password Reset", "user", str(user["id"]), user["name"], f"Reset requested for {email}"),
                )
                reset_token = raw_token if os.environ.get("SHOW_RESET_TOKEN") == "1" else None
                create_notification(conn, "admin", "Password reset requested", f"{user['name']} requested a password reset.")
                log_action(conn, user["role"], "requested password reset", "user", str(user["id"]))
                conn.commit()

        response = {"message": "If this email exists, a reset link has been prepared."}
        if reset_token:
            response["resetToken"] = reset_token
        return jsonify(response)

    @app.post("/api/auth/reset-password")
    def reset_password_with_token():
        payload = request.get_json(silent=True) or {}
        token = payload.get("token", "")
        new_password = payload.get("newPassword", "")
        if not token or len(new_password) < 6:
            return jsonify({"message": "Reset token and a 6 character password are required."}), 400

        token_hash = hashlib.sha256(token.encode()).hexdigest()
        with get_connection() as conn:
            reset_row = conn.execute(
                """
                SELECT id, user_id AS userId, expires_at AS expiresAt, used_at AS usedAt
                FROM password_reset_tokens
                WHERE token_hash = ?
                """,
                (token_hash,),
            ).fetchone()
            if reset_row is None or reset_row["usedAt"] is not None or int(reset_row["expiresAt"]) < int(time.time()):
                return jsonify({"message": "Reset link is invalid or expired."}), 400
            conn.execute("UPDATE users SET password = ? WHERE id = ?", (generate_password_hash(new_password), reset_row["userId"]))
            conn.execute("UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?", (reset_row["id"],))
            log_action(conn, "password reset", "changed password with reset token", "user", str(reset_row["userId"]))
            conn.commit()
        return jsonify({"message": "Password reset. You can now sign in."})

    @app.get("/api/users/me/preferences")
    def get_preferences():
        user = current_user()
        row = query_one(
            """
            SELECT theme, dashboard_layout AS dashboardLayout, table_filters AS tableFilters,
                   last_selected_meal AS lastSelectedMeal, notification_settings AS notificationSettings
            FROM user_preferences
            WHERE user_id = ?
            """,
            (user["sub"],),
        )
        if row is None:
            return jsonify({
                "theme": "system",
                "dashboardLayout": "comfortable",
                "tableFilters": {},
                "lastSelectedMeal": None,
                "notificationSettings": {"laundry": True, "meals": True, "password": True, "admin": True},
            })
        row["tableFilters"] = json.loads(row["tableFilters"] or "{}")
        row["notificationSettings"] = json.loads(row["notificationSettings"] or "{}")
        return jsonify(row)

    @app.put("/api/users/me/preferences")
    def save_preferences():
        user = current_user()
        payload = request.get_json(silent=True) or {}
        table_filters = json.dumps(payload.get("tableFilters", {}))
        notification_settings = json.dumps(payload.get("notificationSettings", {}))
        with get_connection() as conn:
            existing = conn.execute("SELECT user_id FROM user_preferences WHERE user_id = ?", (user["sub"],)).fetchone()
            if existing:
                conn.execute(
                    """
                    UPDATE user_preferences
                    SET theme = ?, dashboard_layout = ?, table_filters = ?, last_selected_meal = ?, notification_settings = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                    """,
                    (payload.get("theme", "system"), payload.get("dashboardLayout", "comfortable"), table_filters, payload.get("lastSelectedMeal"), notification_settings, user["sub"]),
                )
            else:
                conn.execute(
                    """
                    INSERT INTO user_preferences (user_id, theme, dashboard_layout, table_filters, last_selected_meal, notification_settings)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (user["sub"], payload.get("theme", "system"), payload.get("dashboardLayout", "comfortable"), table_filters, payload.get("lastSelectedMeal"), notification_settings),
                )
            log_action(conn, user["name"], "updated preferences", "user", str(user["sub"]))
            conn.commit()
        return get_preferences()

    @app.put("/api/users/<int:user_id>/photo")
    def update_user_photo(user_id):
        user = current_user()
        if user["role"] != "admin" and int(user["sub"]) != user_id:
            return jsonify({"message": "You can only update your own photo."}), 403
        payload = request.get_json(silent=True) or {}
        photo_url = payload.get("photoUrl", "")
        if photo_url and not photo_url.startswith(("data:image/", "https://", "http://")):
            return jsonify({"message": "Photo must be an image data URL or image URL."}), 400
        with get_connection() as conn:
            result = conn.execute("UPDATE users SET photo_url = ? WHERE id = ?", (photo_url, user_id))
            log_action(conn, user["name"], "updated photo", "user", str(user_id))
            conn.commit()
        if result.rowcount == 0:
            return jsonify({"message": "User not found."}), 404
        return jsonify(user_public_row(user_id))

    @app.get("/api/students")
    def students():
        if request.args.get("page"):
            page, page_size, offset = pagination_args()
            search = f"%{request.args.get('search', '').strip()}%"
            status = request.args.get("status", "All")
            where = "role = 'student' AND (name LIKE ? OR email LIKE ? OR student_id LIKE ? OR hostel LIKE ?)"
            params = [search, search, search, search]
            if status != "All":
                where += " AND status = ?"
                params.append(status)
            total = query_one(f"SELECT COUNT(*) AS count FROM users WHERE {where}", tuple(params))["count"]
            rows = query_all(
                f"""
                SELECT id, name, email, student_id AS studentId, hostel, room, course, level, phone, photo_url AS photoUrl, status
                FROM users
                WHERE {where}
                ORDER BY name
                LIMIT ? OFFSET ?
                """,
                tuple(params + [page_size, offset]),
            )
            return paginated_response(rows, total, page, page_size)

        return cached_json(
            "students",
            30,
            lambda: query_all(
                """
                SELECT id, name, email, student_id AS studentId, hostel, room, course, level, phone, photo_url AS photoUrl, status
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
            SELECT id, name, email, student_id AS studentId, hostel, room, course, level, phone, photo_url AS photoUrl, status
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
        acting_user = current_user()
        if acting_user["role"] != "admin" and int(acting_user["sub"]) != user_id:
            return jsonify({"message": "You can only update your own profile."}), 403
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
            log_action(conn, acting_user["name"], "updated profile", "user", str(user_id))
            conn.commit()

        row = query_one(
            """
            SELECT id, name, email, role, student_id AS studentId, hostel, room, course, level, phone, photo_url AS photoUrl, status
            FROM users
            WHERE id = ?
            """,
            (user_id,),
        )
        return jsonify(row)

    @app.post("/api/users/<int:user_id>/password")
    def change_password(user_id):
        payload = request.get_json(silent=True) or {}
        acting_user = current_user()
        if acting_user["role"] != "admin" and int(acting_user["sub"]) != user_id:
            return jsonify({"message": "You can only change your own password."}), 403
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
            SELECT id, name, email, role, student_id AS studentId, hostel, room, course, level, phone, photo_url AS photoUrl, status
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

    @app.get("/api/users/<int:user_id>/timeline")
    def user_timeline(user_id):
        acting_user = current_user()
        if acting_user["role"] != "admin" and int(acting_user["sub"]) != user_id:
            return jsonify({"message": "You can only view your own timeline."}), 403
        user = user_public_row(user_id)
        if user is None:
            return jsonify({"message": "User not found."}), 404
        student_id = user.get("studentId")
        events = []
        audits = query_all(
            "SELECT action, entity_type AS entityType, entity_ref AS entityRef, created_at AS createdAt FROM audit_logs WHERE entity_ref = ? OR actor = ? ORDER BY id DESC LIMIT 50",
            (str(user_id), user["name"]),
        )
        for item in audits:
            events.append({"type": "audit", "title": item["action"], "detail": item.get("entityRef"), "createdAt": item["createdAt"]})
        if student_id:
            for item in query_all("SELECT m.type, ms.scanned_at AS createdAt FROM meal_scans ms JOIN meals m ON m.id = ms.meal_id WHERE ms.student_id = ? ORDER BY ms.id DESC LIMIT 30", (student_id,)):
                events.append({"type": "meal", "title": f"{item['type']} collected", "detail": "Meal scan", "createdAt": item["createdAt"]})
            for item in query_all("SELECT basket_code AS basketCode, status, received_at AS createdAt FROM laundry_baskets WHERE student_id = ? ORDER BY id DESC LIMIT 30", (student_id,)):
                events.append({"type": "laundry", "title": f"Basket #{item['basketCode']}", "detail": item["status"], "createdAt": item["createdAt"]})
            for item in query_all("SELECT title, message, created_at AS createdAt FROM notifications WHERE student_id = ? ORDER BY id DESC LIMIT 30", (student_id,)):
                events.append({"type": "notification", "title": item["title"], "detail": item["message"], "createdAt": item["createdAt"]})
        return jsonify({"user": user, "events": events[:80]})

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
            SELECT id, name, email, student_id AS studentId, hostel, room, course, level, phone, photo_url AS photoUrl, status
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
        if request.args.get("page"):
            page, page_size, offset = pagination_args()
            search = f"%{request.args.get('search', '').strip()}%"
            status = request.args.get("status", "All")
            where = "(basket_code LIKE ? OR student_id LIKE ? OR status LIKE ?)"
            params = [search, search, search]
            if status != "All":
                where += " AND status = ?"
                params.append(status)
            total = query_one(f"SELECT COUNT(*) AS count FROM laundry_baskets WHERE {where}", tuple(params))["count"]
            rows = query_all(
                f"""
                SELECT id, basket_code AS basketCode, student_id AS studentId, status,
                       received_at AS receivedAt, estimated_finish AS estimatedFinish, notes
                FROM laundry_baskets
                WHERE {where}
                ORDER BY id DESC
                LIMIT ? OFFSET ?
                """,
                tuple(params + [page_size, offset]),
            )
            return paginated_response(rows, total, page, page_size)

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
                conn.execute(
                    "INSERT INTO approval_requests (request_type, entity_type, entity_ref, requested_by, notes) VALUES (?, ?, ?, ?, ?)",
                    ("Laundry Request", "basket", basket_code, student_id, payload.get("notes", "Student laundry request")),
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

    @app.post("/api/laundry/scan")
    def scan_laundry():
        payload = request.get_json(silent=True) or {}
        action = payload.get("action")
        basket_code = (payload.get("basketCode") or "").strip()
        student_id = (payload.get("studentId") or "").strip()
        staff_name = payload.get("staffName") or "Laundry Staff"

        if action not in ["receive", "return"]:
            return jsonify({"message": "Scan action must be receive or return."}), 400
        if not basket_code or not student_id:
            return jsonify({"message": "Basket code and student ID are required."}), 400

        student = query_one(
            """
            SELECT id, name, student_id AS studentId, status
            FROM users
            WHERE role = 'student' AND student_id = ?
            """,
            (student_id,),
        )
        if student is None:
            return jsonify({"message": "Student not found."}), 404
        if student["status"] != "Active":
            return jsonify({"message": f"{student['name']} is inactive."}), 403

        with get_connection() as conn:
            existing = conn.execute(
                """
                SELECT id, basket_code AS basketCode, student_id AS studentId, status,
                       received_at AS receivedAt, estimated_finish AS estimatedFinish, notes
                FROM laundry_baskets
                WHERE basket_code = ?
                """,
                (basket_code,),
            ).fetchone()

            if action == "return":
                if existing is None:
                    return jsonify({"message": "Basket must be received before it can be returned."}), 404
                if existing["studentId"] != student_id:
                    return jsonify({"message": "Basket does not belong to this student."}), 409
                status = "Picked Up"
                activity = "Returned to Student"
                conn.execute("UPDATE laundry_baskets SET status = ? WHERE id = ?", (status, existing["id"]))
                basket_id = existing["id"]
            else:
                status = "Pending"
                activity = "Received by Scanner"
                if existing is None:
                    cursor = conn.execute(
                        """
                        INSERT INTO laundry_baskets (basket_code, student_id, status, received_at, estimated_finish, notes)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """,
                        (basket_code, student_id, status, "Now", payload.get("estimatedFinish"), payload.get("notes", "Scanned at laundry desk")),
                    )
                    basket_id = cursor.lastrowid
                else:
                    if existing["studentId"] != student_id:
                        return jsonify({"message": "Basket code is already assigned to another student."}), 409
                    conn.execute("UPDATE laundry_baskets SET status = ? WHERE id = ?", (status, existing["id"]))
                    basket_id = existing["id"]

            conn.execute(
                "INSERT INTO laundry_activity (basket_code, action, staff_name, activity_time) VALUES (?, ?, ?, ?)",
                (basket_code, activity, staff_name, "Now"),
            )
            create_notification(conn, "student", "Laundry scan saved", f"Basket #{basket_code} was {activity.lower()}.", student_id)
            log_action(conn, staff_name, activity.lower(), "basket", basket_code)
            conn.commit()

        basket = query_one(
            """
            SELECT id, basket_code AS basketCode, student_id AS studentId, status,
                   received_at AS receivedAt, estimated_finish AS estimatedFinish, notes
            FROM laundry_baskets
            WHERE id = ?
            """,
            (basket_id,),
        )
        return jsonify({"message": f"Basket #{basket_code} saved.", "basket": basket, "student": student})

    @app.get("/api/laundry/issues")
    def laundry_issues():
        status = request.args.get("status", "All")
        page, page_size, offset = pagination_args()
        where = "1 = 1"
        params = []
        if status != "All":
            where += " AND status = ?"
            params.append(status)
        total = query_one(f"SELECT COUNT(*) AS count FROM laundry_issues WHERE {where}", tuple(params))["count"]
        rows = query_all(
            f"""
            SELECT id, basket_id AS basketId, basket_code AS basketCode, student_id AS studentId,
                   issue_type AS issueType, notes, status, reported_by AS reportedBy,
                   created_at AS createdAt, resolved_at AS resolvedAt
            FROM laundry_issues
            WHERE {where}
            ORDER BY id DESC
            LIMIT ? OFFSET ?
            """,
            tuple(params + [page_size, offset]),
        )
        return paginated_response(rows, total, page, page_size)

    @app.post("/api/laundry/issues")
    def create_laundry_issue():
        payload = request.get_json(silent=True) or {}
        basket_id = payload.get("basketId")
        issue_type = payload.get("issueType", "").strip()
        notes = payload.get("notes", "").strip()
        if not basket_id or not issue_type:
            return jsonify({"message": "Basket and issue type are required."}), 400

        with get_connection() as conn:
            basket = conn.execute(
                "SELECT id, basket_code AS basketCode, student_id AS studentId FROM laundry_baskets WHERE id = ?",
                (basket_id,),
            ).fetchone()
            if basket is None:
                return jsonify({"message": "Basket not found."}), 404
            cursor = conn.execute(
                """
                INSERT INTO laundry_issues (basket_id, basket_code, student_id, issue_type, notes, reported_by)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (basket_id, basket["basketCode"], basket["studentId"], issue_type, notes, current_user().get("name", "Laundry Staff")),
            )
            conn.execute(
                "INSERT INTO approval_requests (request_type, entity_type, entity_ref, requested_by, notes) VALUES (?, ?, ?, ?, ?)",
                ("Laundry Issue", "basket", basket["basketCode"], current_user().get("name", "Laundry Staff"), f"{issue_type}: {notes}"),
            )
            create_notification(conn, "student", "Laundry issue reported", f"An issue was reported for basket #{basket['basketCode']}: {issue_type}.", basket["studentId"])
            create_notification(conn, "admin", "Laundry issue reported", f"{issue_type} reported for basket #{basket['basketCode']}.")
            log_action(conn, current_user().get("name", "Laundry Staff"), "reported issue", "basket", basket["basketCode"])
            conn.commit()
            issue_id = cursor.lastrowid

        issue = query_one(
            """
            SELECT id, basket_id AS basketId, basket_code AS basketCode, student_id AS studentId,
                   issue_type AS issueType, notes, status, reported_by AS reportedBy,
                   created_at AS createdAt, resolved_at AS resolvedAt
            FROM laundry_issues WHERE id = ?
            """,
            (issue_id,),
        )
        return jsonify(issue), 201

    @app.patch("/api/laundry/issues/<int:issue_id>")
    def update_laundry_issue(issue_id):
        payload = request.get_json(silent=True) or {}
        status = payload.get("status")
        if status not in ["Open", "Resolved"]:
            return jsonify({"message": "Issue status must be Open or Resolved."}), 400
        with get_connection() as conn:
            result = conn.execute(
                "UPDATE laundry_issues SET status = ?, resolved_at = CASE WHEN ? = 'Resolved' THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id = ?",
                (status, status, issue_id),
            )
            log_action(conn, current_user().get("name", "Laundry Staff"), f"marked issue {status.lower()}", "laundry_issue", str(issue_id))
            conn.commit()
        if result.rowcount == 0:
            return jsonify({"message": "Issue not found."}), 404
        return jsonify({"message": "Issue updated."})

    @app.get("/api/notifications")
    def notifications():
        role = request.args.get("role", "")
        student_id = request.args.get("studentId")
        user = current_user()
        if user["role"] != "admin" and role != user["role"]:
            return jsonify({"message": "You can only read your own notifications."}), 403
        if user["role"] == "student" and student_id != str(user.get("studentId")):
            return jsonify({"message": "Students can only read their own notifications."}), 403
        if request.args.get("page"):
            page, page_size, offset = pagination_args()
            if student_id:
                total = query_one("SELECT COUNT(*) AS count FROM notifications WHERE user_role = ? AND student_id = ?", (role, student_id))["count"]
                rows = query_all(
                    """
                    SELECT id, user_role AS userRole, student_id AS studentId, title, message, created_at AS createdAt, is_read AS isRead
                    FROM notifications
                    WHERE user_role = ? AND student_id = ?
                    ORDER BY id DESC
                    LIMIT ? OFFSET ?
                    """,
                    (role, student_id, page_size, offset),
                )
            else:
                total = query_one("SELECT COUNT(*) AS count FROM notifications WHERE user_role = ?", (role,))["count"]
                rows = query_all(
                    """
                    SELECT id, user_role AS userRole, student_id AS studentId, title, message, created_at AS createdAt, is_read AS isRead
                    FROM notifications
                    WHERE user_role = ?
                    ORDER BY id DESC
                    LIMIT ? OFFSET ?
                    """,
                    (role, page_size, offset),
                )
            return paginated_response(rows, total, page, page_size)

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
            notification = conn.execute("SELECT user_role AS userRole, student_id AS studentId FROM notifications WHERE id = ?", (notification_id,)).fetchone()
            if notification is None:
                return jsonify({"message": "Notification not found."}), 404
            user = current_user()
            if user["role"] != "admin" and notification["userRole"] != user["role"]:
                return jsonify({"message": "You can only update your own notifications."}), 403
            if user["role"] == "student" and notification["studentId"] != str(user.get("studentId")):
                return jsonify({"message": "Students can only update their own notifications."}), 403
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
        user = current_user()
        if user["role"] != "admin" and role != user["role"]:
            return jsonify({"message": "You can only update your own notifications."}), 403
        if user["role"] == "student" and student_id != str(user.get("studentId")):
            return jsonify({"message": "Students can only update their own notifications."}), 403

        with get_connection() as conn:
            if student_id:
                conn.execute("UPDATE notifications SET is_read = 1 WHERE user_role = ? AND student_id = ?", (role, student_id))
            else:
                conn.execute("UPDATE notifications SET is_read = 1 WHERE user_role = ?", (role,))
            conn.commit()

        return jsonify({"message": "Notifications marked as read."})

    @app.get("/api/audit-logs")
    def audit_logs():
        if request.args.get("page"):
            page, page_size, offset = pagination_args()
            search = f"%{request.args.get('search', '').strip()}%"
            where = "actor LIKE ? OR action LIKE ? OR entity_type LIKE ? OR entity_ref LIKE ?"
            params = (search, search, search, search)
            total = query_one(f"SELECT COUNT(*) AS count FROM audit_logs WHERE {where}", params)["count"]
            rows = query_all(
                f"""
                SELECT id, actor, action, entity_type AS entityType, entity_ref AS entityRef, created_at AS createdAt
                FROM audit_logs
                WHERE {where}
                ORDER BY id DESC
                LIMIT ? OFFSET ?
                """,
                params + (page_size, offset),
            )
            return paginated_response(rows, total, page, page_size)

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

    @app.get("/api/admin/approvals")
    def approval_queue():
        status = request.args.get("status", "Pending")
        page, page_size, offset = pagination_args()
        where = "status = ?"
        params = [status]
        if status == "All":
            where = "1 = 1"
            params = []
        total = query_one(f"SELECT COUNT(*) AS count FROM approval_requests WHERE {where}", tuple(params))["count"]
        rows = query_all(
            f"""
            SELECT id, request_type AS requestType, entity_type AS entityType, entity_ref AS entityRef,
                   requested_by AS requestedBy, status, notes, created_at AS createdAt,
                   decided_by AS decidedBy, decided_at AS decidedAt
            FROM approval_requests
            WHERE {where}
            ORDER BY id DESC
            LIMIT ? OFFSET ?
            """,
            tuple(params + [page_size, offset]),
        )
        return paginated_response(rows, total, page, page_size)

    @app.patch("/api/admin/approvals/<int:approval_id>")
    def decide_approval(approval_id):
        payload = request.get_json(silent=True) or {}
        status = payload.get("status")
        if status not in ["Approved", "Rejected"]:
            return jsonify({"message": "Approval status must be Approved or Rejected."}), 400
        with get_connection() as conn:
            approval = conn.execute(
                "SELECT id, request_type AS requestType, entity_type AS entityType, entity_ref AS entityRef FROM approval_requests WHERE id = ?",
                (approval_id,),
            ).fetchone()
            if approval is None:
                return jsonify({"message": "Approval request not found."}), 404
            conn.execute(
                "UPDATE approval_requests SET status = ?, decided_by = ?, decided_at = CURRENT_TIMESTAMP WHERE id = ?",
                (status, current_user().get("name", "admin"), approval_id),
            )
            if approval["requestType"] == "Laundry Request" and approval["entityRef"] and status == "Approved":
                conn.execute("UPDATE laundry_baskets SET status = 'Pending' WHERE basket_code = ?", (approval["entityRef"],))
                create_notification(conn, "laundry", "Laundry request approved", f"Basket #{approval['entityRef']} was approved by admin.")
            log_action(conn, current_user().get("name", "admin"), f"{status.lower()} approval", approval["entityType"], approval["entityRef"])
            conn.commit()
        return jsonify({"message": f"Request {status.lower()}."})

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

    @app.get("/api/database/backup")
    def database_backup():
        tables = [
            "users", "meals", "meal_scans", "laundry_baskets", "kitchen_scan_logs",
            "laundry_activity", "laundry_machines", "laundry_reports", "notifications",
            "audit_logs", "user_preferences", "laundry_issues", "approval_requests",
        ]
        data = {table: query_all(f"SELECT * FROM {table}") for table in tables}
        data["generatedAt"] = int(time.time())
        return jsonify(data)

    @app.post("/api/admin/import/students")
    def import_students():
        payload = request.get_json(silent=True) or {}
        csv_text = payload.get("csv", "")
        if not csv_text.strip():
            return jsonify({"message": "CSV content is required."}), 400

        reader = csv.DictReader(io.StringIO(csv_text))
        created = 0
        skipped = 0
        demo_password = generate_password_hash(payload.get("defaultPassword", "password"))
        with get_connection() as conn:
            for row in reader:
                required = [row.get("name"), row.get("email"), row.get("studentId"), row.get("hostel"), row.get("course"), row.get("level")]
                if not all(required):
                    skipped += 1
                    continue
                try:
                    conn.execute(
                        """
                        INSERT INTO users (name, email, password, role, student_id, hostel, room, course, level, phone, status)
                        VALUES (?, ?, ?, 'student', ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (row["name"], row["email"], demo_password, row["studentId"], row["hostel"], row.get("room", ""), row["course"], row["level"], row.get("phone", ""), row.get("status", "Active")),
                    )
                    created += 1
                except DB_INTEGRITY_ERROR:
                    skipped += 1
            log_action(conn, current_user().get("name", "admin"), "bulk imported students", "student", str(created))
            conn.commit()
        return jsonify({"message": f"Imported {created} students. Skipped {skipped}.", "created": created, "skipped": skipped})

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
            active_students = query_one("SELECT COUNT(*) AS count FROM users WHERE role = 'student' AND status = 'Active'")["count"]
            inactive_students = query_one("SELECT COUNT(*) AS count FROM users WHERE role = 'student' AND status != 'Active'")["count"]
            laundry_volume = query_all("SELECT status, COUNT(*) AS count FROM laundry_baskets GROUP BY status ORDER BY status")
            unresolved_issues = query_one("SELECT COUNT(*) AS count FROM laundry_issues WHERE status = 'Open'")["count"]
            peak_scans = query_all(
                """
                SELECT meal_type AS label, COUNT(*) AS count
                FROM kitchen_scan_logs
                GROUP BY meal_type
                ORDER BY count DESC
                LIMIT 5
                """
            )
            return {
                "mealTrends": meal_trends,
                "machineUtilizationAverage": machine_average,
                "kpis": kpis,
                "studentStatus": {"active": active_students, "inactive": inactive_students},
                "laundryVolume": laundry_volume,
                "unresolvedIssues": unresolved_issues,
                "peakScans": peak_scans,
            }

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
                SELECT id, name, email, student_id AS studentId, hostel, room, course, level, phone, photo_url AS photoUrl, status
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
            SELECT id, name, email, student_id AS studentId, hostel, room, course, level, phone, photo_url AS photoUrl, status
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

        late_reason = payload.get("lateReason", "").strip()
        meal = query_one("SELECT id, type, status FROM meals WHERE id = ?", (meal_id,))
        if meal is None:
            return jsonify({"message": "Meal not found."}), 404
        if meal["status"] != "Active" and not late_reason:
            return jsonify({"message": f"{meal['type']} is not currently active. Add a late/override reason to approve."}), 400
        student = query_one(
            """
            SELECT id, name, email, student_id AS studentId, hostel, room, course, level, phone, photo_url AS photoUrl, status
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
            action = "approved scan" if meal["status"] == "Active" else f"approved override scan: {late_reason}"
            log_action(conn, current_user().get("name", "kitchen"), action, "meal", f"{student_id}:{meal['type']}")
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
