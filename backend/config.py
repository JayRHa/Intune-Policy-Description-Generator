from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    azure_openai_endpoint: str = ""
    azure_openai_api_key: str = ""
    azure_openai_deployment: str = ""
    azure_openai_api_version: str = "2025-04-01-preview"
    graph_api_base: str = "https://graph.microsoft.com/beta"
    settings_file: str = "llm_settings.json"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
