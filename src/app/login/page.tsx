"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.push("/");
      } else {
        setIsLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.push("/");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-red-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-2">
            Don&apos;t Break the Chain
          </h1>
          <p className="text-gray-600 text-lg">
            Sign in to start building your streaks
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: "#16a34a",
                    brandAccent: "#22c55e",
                  },
                },
              },
              className: {
                container: "auth-container",
                button: "auth-button",
                input: "auth-input",
              },
            }}
            // Enable OAuth providers here after configuring them in Supabase:
            // providers={["google", "github", "apple"]}
            providers={[]}
            redirectTo={`${window.location.origin}/`}
            providerScopes={{
              github: "user:email",
            }}
          />
        </div>
        
        <p className="text-center text-sm text-gray-600 mt-6">
          By signing in, you agree to build consistent habits 💪
        </p>
        
        <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">Want social login?</p>
          <p>
            To enable Google, GitHub, or Apple sign-in, configure the providers
            in your Supabase dashboard, then uncomment the providers line in{" "}
            <code className="bg-white px-2 py-1 rounded">
              src/app/login/page.tsx
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}

