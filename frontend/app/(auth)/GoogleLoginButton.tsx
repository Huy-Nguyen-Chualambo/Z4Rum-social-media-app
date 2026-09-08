"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: { theme: "outline"; size: "large"; width?: number; text?: "signin_with" | "signup_with" }
          ) => void;
        };
      };
    };
  }
}

type GoogleLoginButtonProps = {
  text?: "signin_with" | "signup_with";
  onCredential: (credential: string) => void | Promise<void>;
  onError?: (message: string) => void;
};

export function GoogleLoginButton({ text = "signin_with", onCredential, onError }: GoogleLoginButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const credentialRef = useRef(onCredential);
  const errorRef = useRef(onError);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    credentialRef.current = onCredential;
    errorRef.current = onError;
  }, [onCredential, onError]);

  useEffect(() => {
    if (!clientId || !buttonRef.current) return;

    const renderGoogleButton = () => {
      if (!buttonRef.current || !window.google?.accounts?.id) return;

      buttonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (!response.credential) {
            errorRef.current?.("Không nhận được thông tin từ Google");
            return;
          }
          void credentialRef.current(response.credential);
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        text,
        width: buttonRef.current.offsetWidth || 320,
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return;
    }
    const existingScript = document.querySelector<HTMLScriptElement>("script[src='https://accounts.google.com/gsi/client']");
    const script = existingScript || document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    script.onerror = () => errorRef.current?.("Không thể tải Google login");
    if (!existingScript) document.head.appendChild(script);
  }, [clientId, text]);

  if (!clientId) {
    return (
      <div className="text-sm text-amber-300">
        Cần cấu hình NEXT_PUBLIC_GOOGLE_CLIENT_ID để bật đăng nhập Google.
      </div>
    );
  }

  return <div ref={buttonRef} className="min-h-10 w-full overflow-hidden rounded-lg" />;
}
