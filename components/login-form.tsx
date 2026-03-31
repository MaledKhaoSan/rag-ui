"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { setMockAuthSession } from "@/lib/mock-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const DEMO_EMAIL = "admin@gmail.com";
const DEMO_PASSWORD = "P@ssw0rd";

export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [emailError, setEmailError] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);

    const completeMockLogin = (label: string) => {
        setMockAuthSession(label);
        router.push("/chat");
        router.refresh();
    };

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedEmail = email.trim();
        const nextEmailErr =
            trimmedEmail === ""
                ? "กรุณากรอกอีเมลตามบัญชีทดสอบ"
                : trimmedEmail !== DEMO_EMAIL
                    ? "อีเมลต้องตรงกับบัญชีทดสอบ"
                    : null;
        const nextPasswordErr =
            password === ""
                ? "กรุณากรอกรหัสผ่านตามบัญชีทดสอบ"
                : password !== DEMO_PASSWORD
                    ? "รหัสผ่านต้องตรงกับบัญชีทดสอบ"
                    : null;

        setEmailError(nextEmailErr);
        setPasswordError(nextPasswordErr);

        if (nextEmailErr || nextPasswordErr) {
            return;
        }

        setIsPending(true);
        window.setTimeout(() => {
            completeMockLogin(trimmedEmail);
            setIsPending(false);
        }, 200);
    };

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="overflow-hidden p-0 shadow-2xl">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <form className="p-6 md:p-8" onSubmit={onSubmit}>
                        <FieldGroup>
                            <div className="flex flex-col items-center gap-2 text-center">
                                <h1 className="text-2xl font-bold tracking-tight">
                                    Single Window
                                </h1>
                                <p className="text-sm font-medium text-foreground">
                                    @ Marine Department
                                </p>
                                <p className="text-balance text-sm leading-snug text-muted-foreground">
                                    มุ่งสู่การขนส่งทางน้ำและพาณิชย์นาวีที่ยั่งยืน
                                </p>
                            </div>
                            <Field data-invalid={!!emailError}>
                                <FieldLabel htmlFor="email">อีเมล</FieldLabel>
                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="username"
                                    placeholder={DEMO_EMAIL}
                                    value={email}
                                    aria-invalid={!!emailError}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setEmailError(null);
                                    }}
                                />
                                {emailError ? (
                                    <FieldError>{emailError}</FieldError>
                                ) : null}
                            </Field>
                            <Field data-invalid={!!passwordError}>
                                <div className="flex items-center">
                                    <FieldLabel htmlFor="password">
                                        รหัสผ่าน
                                    </FieldLabel>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    autoComplete="current-password"
                                    placeholder="รหัสผ่านทดสอบ"
                                    value={password}
                                    aria-invalid={!!passwordError}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setPasswordError(null);
                                    }}
                                />
                                {passwordError ? (
                                    <FieldError>{passwordError}</FieldError>
                                ) : null}
                            </Field>
                            <FieldDescription>
                                เข้าสู่ระบบด้วยบัญชีทดสอบ{" "}
                                <span className="font-medium text-foreground">
                                    {DEMO_EMAIL}
                                </span>{" "}
                                /{" "}
                                <span className="font-medium text-foreground">
                                    {DEMO_PASSWORD}
                                </span>
                            </FieldDescription>
                            <Field>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                    <div className="relative hidden min-h-[320px] overflow-hidden bg-muted/30 md:block dark:bg-muted/20">
                        <div
                            className="absolute inset-0 bg-[url('/corner.png')] bg-no-repeat bg-cover opacity-95 dark:opacity-90"
                            aria-hidden
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
