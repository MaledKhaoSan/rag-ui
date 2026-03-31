import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden p-6 md:p-10">
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[url('/LoginScreen.png')] bg-cover bg-center bg-no-repeat"
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-sm md:max-w-4xl">
        <LoginForm />
      </div>
    </div>
  )
}
