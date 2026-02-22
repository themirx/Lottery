from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True)
class User:
    username: str
    password_hash: str


@dataclass(frozen=True)
class LotteryResult:
    participants: Sequence[str]
    winners: Sequence[str]
    requested_winners: int
