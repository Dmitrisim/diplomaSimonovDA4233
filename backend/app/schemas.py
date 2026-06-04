from __future__ import annotations

from pydantic import BaseModel


class InputMeta(BaseModel):
    filename: str | None
    format: str | None
    size_bytes: int | None
    width: int | None
    height: int | None


class OutputMeta(BaseModel):
    filename: str
    format: str
    size_bytes: int
    width: int | None
    height: int | None


class ProcessingMeta(BaseModel):
    mode: str
    used_ai: bool
    model: str | None
    time_ms: int | None


class UrlsMeta(BaseModel):
    source: str | None = None
    result: str
    download: str


class ProcessResponse(BaseModel):
    id: str
    status: str
    message: str
    input: InputMeta
    output: OutputMeta
    processing: ProcessingMeta
    urls: UrlsMeta


class HealthResponse(BaseModel):
    status: str
    service: str
    ai_model_present: bool
    uploads_dir: str
    results_dir: str


class ModelStatusResponse(BaseModel):
    status: str
    service: str
    available: bool
    demo_mode: bool
    default_processor: str
    active_processor: str
    model: str | None
    model_name: str | None
    framework: str
    model_path: str | None
    model_file_exists: bool
    availability_reason: str | None
    supported_modes: list[str]
    ai_supported_modes: list[str]
    ai_processors: list[str]
    fallback_available: bool
    modes: list[str]


class DeleteResultResponse(BaseModel):
    status: str
    id: str
    deleted_files: list[str]
