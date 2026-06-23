import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./app.db"
    SECRET_KEY: str = "secret_key_change_me_govguide"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

settings = Settings()
