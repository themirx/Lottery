from __future__ import annotations

from functools import wraps
from typing import Callable, Optional

from flask import (
    Blueprint,
    Response,
    flash,
    redirect,
    render_template,
    request,
    session,
    url_for,
)

from .models import LotteryResult
from .services import ServiceContainer, ValidationError


def create_routes(services: ServiceContainer) -> Blueprint:
    bp = Blueprint("lottery", __name__)

    def current_user() -> Optional[str]:
        return session.get("user")

    def login_required(view: Callable[..., Response]) -> Callable[..., Response]:
        @wraps(view)
        def wrapped(*args, **kwargs):
            if not current_user():
                return redirect(url_for("lottery.login"))
            return view(*args, **kwargs)

        return wrapped

    @bp.get("/health")
    def health() -> Response:
        return {"status": "ok"}, 200

    @bp.route("/login", methods=["GET", "POST"])
    def login() -> Response:
        if current_user():
            return redirect(url_for("lottery.index"))

        if request.method == "POST":
            username = request.form.get("username", "").strip()
            password = request.form.get("password", "")
            if not username or not password:
                flash("Please enter both username and password.", "error")
            else:
                user = services.auth_service.authenticate(username, password)
                if user:
                    session.clear()
                    session["user"] = user.username
                    return redirect(url_for("lottery.index"))
                flash("Invalid credentials.", "error")

        return render_template("login.html")

    @bp.post("/logout")
    def logout() -> Response:
        session.clear()
        return redirect(url_for("lottery.login"))

    @bp.route("/", methods=["GET", "POST"])
    @login_required
    def index() -> Response:
        result: Optional[LotteryResult] = None
        participants_text = ""
        winners_count = 1

        if request.method == "POST":
            participants_text = request.form.get("participants", "")
            winners_count_raw = request.form.get("winners", "1")
            try:
                winners_count = int(winners_count_raw)
            except ValueError:
                winners_count = 1

            participants = services.participant_parser.parse(participants_text)
            try:
                result = services.lottery_service.draw(participants, winners_count)
            except ValidationError as exc:
                flash(str(exc), "error")

        return render_template(
            "index.html",
            result=result,
            participants_text=participants_text,
            winners_count=winners_count,
            user=current_user(),
        )

    return bp
