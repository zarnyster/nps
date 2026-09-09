import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Login() {
  const oauthUrl = "https://auth.kimi.com/api/oauth/authorize" +
    "?client_id=19ed9cde-bb42-8bf0-8000-00004ae7bc78" +
    `&redirect_uri=${encodeURIComponent(`${window.location.origin}/api/oauth/callback`)}` +
    "&response_type=code&scope=profile" +
    `&state=${btoa(`${window.location.origin}/api/oauth/callback`)}`;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Вход</CardTitle>
        </CardHeader>
        <CardContent>
          <Button className="w-full" size="lg" asChild>
            <a href={oauthUrl}>Войти через Kimi</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
