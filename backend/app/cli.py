import argparse
import asyncio
import getpass

from app.db.session import AsyncSessionLocal, engine
from app.models.user import UserRole
from app.repositories.user import UserRepository
from app.services.user import create_user


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Guest House Management administration tools")
    command = parser.add_subparsers(dest="command", required=True)
    admin = command.add_parser("create-admin", help="Create the first administrator")
    admin.add_argument("--username", required=True)
    admin.add_argument("--full-name", required=True)

    super_admin = command.add_parser("create-super-admin", help="Create a platform Super Administrator")
    super_admin.add_argument("--username", required=True)
    super_admin.add_argument("--full-name", required=True)
    super_admin.add_argument("--email", required=False, default=None)
    return parser.parse_args()


async def create_super_admin(username: str, full_name: str, email: str | None = None) -> None:
    password = getpass.getpass("Super Admin password: ")
    confirmation = getpass.getpass("Confirm Super Admin password: ")
    if password != confirmation:
        raise SystemExit("Passwords do not match")
    async with AsyncSessionLocal() as session:
        await create_user(
            session,
            full_name=full_name,
            username=username,
            password=password,
            role=UserRole.SUPER_ADMIN,
            email=email,
            property_id=None,
        )
    await engine.dispose()
    print(f"Created platform Super Administrator '{username}'")


async def create_admin(username: str, full_name: str) -> None:
    password = getpass.getpass("Admin password: ")
    confirmation = getpass.getpass("Confirm admin password: ")
    if password != confirmation:
        raise SystemExit("Passwords do not match")
    async with AsyncSessionLocal() as session:
        if await UserRepository(session).list():
            raise SystemExit("Users already exist; refusing to bootstrap another admin")
        await create_user(
            session,
            full_name=full_name,
            username=username,
            password=password,
            role=UserRole.ADMIN,
        )
    await engine.dispose()
    print(f"Created administrator {username}")


def main() -> None:
    args = parse_args()
    if args.command == "create-admin":
        asyncio.run(create_admin(args.username, args.full_name))
    elif args.command == "create-super-admin":
        asyncio.run(create_super_admin(args.username, args.full_name, args.email))


if __name__ == "__main__":
    main()