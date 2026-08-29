import { AuthForm } from "@/components/AuthForm";
import { AuthStage } from "@/components/AuthStage";
import { SplashGate } from "@/components/SplashGate";

export default function LoginPage() {
  return (
    <SplashGate>
      <AuthStage>
        <AuthForm mode="login" />
      </AuthStage>
    </SplashGate>
  );
}
