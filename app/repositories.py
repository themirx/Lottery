from __future__ import annotations

from typing import Iterable, Optional

from .models import User


class UserRepository:
    def __init__(self, users: Iterable[User]) -> None:
        self._users = {user.username.casefold(): user for user in users}

    def get_by_username(self, username: str) -> Optional[User]:
        return self._users.get(username.casefold())
