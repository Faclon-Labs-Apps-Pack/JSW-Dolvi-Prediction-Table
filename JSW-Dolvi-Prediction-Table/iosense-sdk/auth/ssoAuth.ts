const TOKEN_KEY = "iosense_token"
const ORG_KEY = "iosense_org"
const USER_ID_KEY = "iosense_userId"

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function storeToken(token: string, organisation: string, userId: string) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(ORG_KEY, organisation)
  localStorage.setItem(USER_ID_KEY, userId)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ORG_KEY)
  localStorage.removeItem(USER_ID_KEY)
}

export async function validateSSOToken(ssoToken: string): Promise<{
  token: string
  organisation: string
  userId: string
}> {
  const res = await fetch(
    `https://connector.iosense.io/api/retrieve-sso-token/${ssoToken}`,
    {
      headers: {
        organisation: "https://iosense.io",
        "ngsw-bypass": "true",
        "Content-Type": "application/json",
      },
    }
  )

  if (!res.ok) throw new Error("SSO token validation failed")

  const data = await res.json()
  if (!data.success) throw new Error(data.errors?.join(", ") || "SSO validation failed")

  return {
    token: data.token,
    organisation: data.organisation,
    userId: data.userId,
  }
}
