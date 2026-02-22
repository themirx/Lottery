from __future__ import annotations

import os
import random
import re
import secrets
from dataclasses import dataclass
from typing import Iterable, Optional, Tuple

from werkzeug.security import check_password_hash, generate_password_hash

from .models import LotteryResult, User
from .repositories import UserRepository


class ValidationError(Exception):
    pass


@dataclass(frozen=True)
class ServiceContainer:
    auth_service: "AuthService"
    participant_parser: "ParticipantParser"
    lottery_service: "LotteryService"


class PasswordHasher:
    def __init__(self, method: str = "pbkdf2:sha256", salt_length: int = 16) -> None:
        self._method = method
        self._salt_length = salt_length

    def hash(self, password: str) -> str:
        return generate_password_hash(password, method=self._method, salt_length=self._salt_length)

    def verify(self, password: str, password_hash: str) -> bool:
        return check_password_hash(password_hash, password)

    @staticmethod
    def looks_like_hash(value: str) -> bool:
        return value.startswith(("pbkdf2:", "scrypt:", "bcrypt:"))


class AuthService:
    def __init__(self, user_repository: UserRepository, password_hasher: PasswordHasher) -> None:
        self._user_repository = user_repository
        self._password_hasher = password_hasher

    def authenticate(self, username: str, password: str) -> Optional[User]:
        user = self._user_repository.get_by_username(username)
        if not user:
            return None
        if self._password_hasher.verify(password, user.password_hash):
            return user
        return None


class ParticipantParser:
    _split_pattern = re.compile(r"[\n,]+")

    def parse(self, raw_input: str) -> list[str]:
        if not raw_input:
            return []

        cleaned: list[str] = []
        seen: set[str] = set()
        for chunk in self._split_pattern.split(raw_input):
            name = " ".join(chunk.strip().split())
            if not name:
                continue
            key = name.casefold()
            if key in seen:
                continue
            seen.add(key)
            cleaned.append(name)
        return cleaned


class LotteryService:
    def __init__(self, rng: Optional[random.Random] = None) -> None:
        self._rng = rng or random.SystemRandom()

    def draw(self, participants: Iterable[str], winners_count: int) -> LotteryResult:
        participants_list = list(participants)
        if not participants_list:
            raise ValidationError("Please add at least one participant.")
        if winners_count < 1:
            raise ValidationError("Please request at least one winner.")
        if winners_count > len(participants_list):
            raise ValidationError("Number of winners cannot exceed the number of participants.")

        winners = self._rng.sample(participants_list, winners_count)
        return LotteryResult(
            participants=participants_list,
            winners=winners,
            requested_winners=winners_count,
        )


def load_users_from_env(
    env: Optional[dict[str, str]] = None,
    password_hasher: Optional[PasswordHasher] = None,
) -> Tuple[list[User], bool]:
    env = env or os.environ
    password_hasher = password_hasher or PasswordHasher()
    users: list[User] = []
    used_default_password = False

    raw_users = env.get("LOTTERY_USERS", "").strip()
    if raw_users:
        entries = [entry.strip() for entry in raw_users.split(",") if entry.strip()]
        for entry in entries:
            if ":" not in entry:
                continue
            username, secret = entry.split(":", 1)
            username = username.strip()
            secret = secret.strip()
            if not username or not secret:
                continue
            if not password_hasher.looks_like_hash(secret):
                secret = password_hasher.hash(secret)
            users.append(User(username=username, password_hash=secret))
    else:
        username = env.get("LOTTERY_ADMIN_USERNAME", "admin")
        password_hash = env.get("LOTTERY_ADMIN_PASSWORD_HASH", "").strip()
        password = env.get("LOTTERY_ADMIN_PASSWORD", "").strip()
        if password_hash:
            hashed = password_hash
        else:
            if not password:
                password = "admin123"
                used_default_password = True
            hashed = password_hasher.hash(password)
        users.append(User(username=username, password_hash=hashed))

    if not users:
        fallback_password = secrets.token_urlsafe(12)
        users.append(User(username="admin", password_hash=password_hasher.hash(fallback_password)))
        used_default_password = True

    return users, used_default_password
