from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

JsonRpcId = str | int | None


class JsonRpcErrorObject(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: int
    message: str
    data: Any | None = None


class JsonRpcRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    jsonrpc: Literal["2.0"]
    id: JsonRpcId = None
    method: str
    params: dict[str, Any] | None = None


class JsonRpcNotification(BaseModel):
    model_config = ConfigDict(extra="forbid")

    jsonrpc: Literal["2.0"] = "2.0"
    method: str
    params: dict[str, Any] | None = None


class JsonRpcResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    jsonrpc: Literal["2.0"] = "2.0"
    id: JsonRpcId = None
    result: Any | None = None
    error: JsonRpcErrorObject | None = None

    @classmethod
    def result_response(cls, request_id: JsonRpcId, result: Any) -> "JsonRpcResponse":
        return cls(id=request_id, result=result)

    @classmethod
    def error_response(
        cls,
        request_id: JsonRpcId,
        code: int,
        message: str,
        data: Any | None = None,
    ) -> "JsonRpcResponse":
        return cls(
            id=request_id,
            error=JsonRpcErrorObject(code=code, message=message, data=data),
        )

    @classmethod
    def parse_error(cls, message: str, data: Any | None = None) -> "JsonRpcResponse":
        return cls.error_response(None, -32700, message, data)

    @classmethod
    def invalid_request(cls, message: str, data: Any | None = None) -> "JsonRpcResponse":
        return cls.error_response(None, -32600, message, data)

    @classmethod
    def method_not_found(cls, request_id: JsonRpcId, method: str) -> "JsonRpcResponse":
        return cls.error_response(request_id, -32601, f"method not found: {method}")

    @classmethod
    def invalid_params(
        cls,
        request_id: JsonRpcId,
        message: str,
        data: Any | None = None,
    ) -> "JsonRpcResponse":
        return cls.error_response(request_id, -32602, message, data)
