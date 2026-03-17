import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Disable Next.js body parser size limit for file uploads
export const maxDuration = 300; // 5 minutes timeout

export async function POST(req: NextRequest) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
        const formData = await req.formData();

        // Forward the request to the backend
        const response = await fetch(`${apiUrl}/api/v1/rag/upload-process`, {
            method: "POST",
            body: formData,
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            return NextResponse.json(
                {
                    success: false,
                    error: data?.detail || data?.message || response.statusText,
                    status: response.status,
                },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("[Upload Proxy] Error:", error);

        // Provide specific error messages based on error type
        let message = "Failed to connect to backend";
        if (error.code === "ECONNREFUSED") {
            message = "Backend server is not running (connection refused)";
        } else if (error.code === "ETIMEDOUT" || error.name === "TimeoutError") {
            message = "Backend request timed out";
        } else if (error.message) {
            message = error.message;
        }

        return NextResponse.json(
            { success: false, error: message },
            { status: 502 }
        );
    }
}
