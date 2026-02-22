from __future__ import annotations

import os
import secrets

from flask import Flask

from .repositories import UserRepository
from .routes import create_routes
from .services import (
    AuthService,
    LotteryService,
    ParticipantParser,
    PasswordHasher,
    ServiceContainer,
    load_users_from_env,
)


def create_app() -> Flask:
    app = Flask(__name__)

    secret_key = os.getenv("SECRET_KEY")
    if not secret_key:
        secret_key = secrets.token_hex(32)
        app.logger.warning("SECRET_KEY not set; using ephemeral key.")
    app.config["SECRET_KEY"] = secret_key

    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    if os.getenv("SESSION_COOKIE_SECURE", "false").lower() in {"1", "true", "yes"}:
        app.config["SESSION_COOKIE_SECURE"] = True

    password_hasher = PasswordHasher()
    users, used_default_password = load_users_from_env(password_hasher=password_hasher)
    if used_default_password:
        app.logger.warning(
            "Using default credentials. Set LOTTERY_USERS or LOTTERY_ADMIN_PASSWORD in production."
        )

    user_repository = UserRepository(users)
    services = ServiceContainer(
        auth_service=AuthService(user_repository, password_hasher),
        participant_parser=ParticipantParser(),
        lottery_service=LotteryService(),
    )

    app.register_blueprint(create_routes(services))

    return app
