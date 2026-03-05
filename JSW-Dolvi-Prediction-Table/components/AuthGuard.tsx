"use client"

import { useEffect, useState } from "react"
import { validateSSOToken, getStoredToken, storeToken, clearToken } from "@/iosense-sdk/auth/ssoAuth"

type AuthStatus = "checking" | "authenticated" | "unauthenticated"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("checking")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      // 1. URL token always takes priority — handles re-auth and token refresh
      const params = new URLSearchParams(window.location.search)
      const ssoToken = params.get("token")

      if (ssoToken) {
        try {
          const { token, organisation, userId } = await validateSSOToken(ssoToken)
          storeToken(token, organisation, userId) // replaces any existing token

          // Remove token from URL without reload
          params.delete("token")
          const clean = window.location.pathname + (params.toString() ? "?" + params.toString() : "")
          window.history.replaceState({}, "", clean)

          setStatus("authenticated")
        } catch {
          clearToken()
          setError("SSO token is expired or invalid. Please generate a new one from the IOsense portal.")
          setStatus("unauthenticated")
        }
        return
      }

      // 2. Fall back to stored token if no URL token present
      const stored = getStoredToken()
      if (stored) {
        setStatus("authenticated")
        return
      }

      setStatus("unauthenticated")
    }

    init()
  }, [])

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#eeeeee" }}>
        <p className="text-sm text-gray-500">Authenticating...</p>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#eeeeee" }}>
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-sm text-gray-600 mb-4">
            {error ?? "Log in to the IOsense portal, go to Profile, and generate an SSO token. The token will be appended to this app URL automatically."}
          </p>
          <p className="text-xs text-gray-400">
            SSO tokens are one-time use and expire after 60 seconds.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
