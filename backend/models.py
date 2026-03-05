from pydantic import BaseModel


class Policy(BaseModel):
    id: str
    display_name: str
    description: str | None = None
    policy_type: str
    platform: str | None = None
    raw_data: dict | None = None


class GenerateRequest(BaseModel):
    policy_ids: list[dict]  # [{"id": "...", "policy_type": "..."}]
    system_prompt: str | None = None
    template: str | None = None
    custom_instructions: str | None = None


class GenerationResult(BaseModel):
    policy_id: str
    policy_name: str
    policy_type: str
    generated_description: str


class LLMSettings(BaseModel):
    system_prompt: str = (
        "You are an expert Microsoft Intune administrator. Your task is to analyze "
        "Intune policy configurations and generate clear, concise descriptions that "
        "explain what the policy does, what settings it configures, and its impact on "
        "managed devices or users.\n\n"
        "Guidelines:\n"
        "- Be specific about what settings are configured\n"
        "- Mention the target platform if applicable\n"
        "- Explain the security or management impact\n"
        "- Use professional IT documentation style\n"
        "- Keep descriptions between 2-5 sentences"
    )
    template: str = (
        "## {policy_name}\n\n"
        "**Type:** {policy_type}\n"
        "**Platform:** {platform}\n\n"
        "### Description\n"
        "{description}\n"
    )
    custom_instructions: str = ""
