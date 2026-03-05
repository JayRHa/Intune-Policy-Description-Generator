import json
from pathlib import Path

from openai import AsyncAzureOpenAI

from config import settings
from models import LLMSettings

SETTINGS_PATH = Path(settings.settings_file)


def load_llm_settings() -> LLMSettings:
    if SETTINGS_PATH.exists():
        data = json.loads(SETTINGS_PATH.read_text())
        return LLMSettings(**data)
    return LLMSettings()


def save_llm_settings(llm_settings: LLMSettings):
    SETTINGS_PATH.write_text(json.dumps(llm_settings.model_dump(), indent=2))


async def generate_description(
    policy_data: dict,
    policy_name: str,
    policy_type: str,
    system_prompt: str | None = None,
    template: str | None = None,
    custom_instructions: str | None = None,
) -> str:
    llm_settings = load_llm_settings()
    sys_prompt = system_prompt or llm_settings.system_prompt
    tmpl = template or llm_settings.template
    extra = custom_instructions or llm_settings.custom_instructions

    full_system = sys_prompt
    if extra:
        full_system += f"\n\nAdditional Instructions:\n{extra}"

    policy_json = json.dumps(policy_data, indent=2, default=str)

    user_message = (
        f"Analyze the following Intune policy and generate a clear description.\n\n"
        f"Policy Name: {policy_name}\n"
        f"Policy Type: {policy_type}\n\n"
        f"Policy Configuration (JSON):\n```json\n{policy_json}\n```\n\n"
        f"Generate a description following this template structure:\n{tmpl}"
    )

    client = AsyncAzureOpenAI(
        azure_endpoint=settings.azure_openai_endpoint,
        api_key=settings.azure_openai_api_key,
        api_version=settings.azure_openai_api_version,
    )

    response = await client.chat.completions.create(
        model=settings.azure_openai_deployment,
        messages=[
            {"role": "system", "content": full_system},
            {"role": "user", "content": user_message},
        ],
        max_completion_tokens=1000,
    )

    await client.close()
    return response.choices[0].message.content or ""
