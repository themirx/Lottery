import argparse

from werkzeug.security import generate_password_hash


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a password hash for Lottery users.")
    parser.add_argument("password", help="Plain-text password to hash")
    parser.add_argument(
        "--method",
        default="pbkdf2:sha256",
        help="Werkzeug hash method (default: pbkdf2:sha256)",
    )
    args = parser.parse_args()
    print(generate_password_hash(args.password, method=args.method))


if __name__ == "__main__":
    main()
