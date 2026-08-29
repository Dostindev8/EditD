import { AuthForm } from "@/components/AuthForm";
import { AuthStage } from "@/components/AuthStage";
import { SplashGate } from "@/components/SplashGate";

export default function RegisterPage() {
  return (
    <SplashGate>
      <AuthStage>
        <AuthForm mode="register" />
      </AuthStage>
    </SplashGate>
  );
}
