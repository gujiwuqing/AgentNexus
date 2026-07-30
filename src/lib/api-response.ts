import { NextResponse } from "next/server";

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * 统一错误响应。details 可选——不传时响应体保持 { error: { code, message } } 形状，
 * 避免给既有调用方增加多余字段。
 */
export function apiError(status: number, code: string, message: string, details?: unknown) {
  const error = details === undefined ? { code, message } : { code, message, details };
  return NextResponse.json({ error }, { status });
}
