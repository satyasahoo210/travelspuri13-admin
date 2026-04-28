'use client'

import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/utils/supabase/client'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Hotel, Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'

export default function LoginPage() {
  const { logout } = useAuth() // We don't need 'login' from context anymore as it's handled by observer
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email,
          password,
        },
      )

      if (authError) throw authError

      // Note: AuthProvider will detect session change and redirect
    } catch (err: any) {
      console.error('Login failed:', err)
      setError(err.message || 'Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdfdfd] p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <div className="flex justify-center mb-8">
          <div className="bg-primary/5 p-4 rounded-3xl backdrop-blur-sm border border-primary/10">
            <Hotel className="h-10 w-10 text-primary" />
          </div>
        </div>

        <Card className="premium-card backdrop-blur-xl bg-white/80 border-white/50 shadow-2xl overflow-hidden">
          <CardHeader className="space-y-1 text-center pb-8 border-b border-border/50">
            <CardTitle className="text-3xl font-heading font-extrabold tracking-tight">
              Antigravity PMS
            </CardTitle>
            <CardDescription className="text-muted-foreground flex items-center justify-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Welcome back to your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-xl flex items-center gap-3 overflow-hidden"
                >
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p className="font-medium">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 group">
                <Label
                  htmlFor="email"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1"
                >
                  Work Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl bg-secondary/30 border-none transition-all focus:bg-white focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label
                    htmlFor="password"
                    title=""
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Password
                  </Label>
                  <a
                    href="#"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl bg-secondary/30 border-none transition-all focus:bg-white focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex items-center space-x-2 ml-1">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) =>
                    setRememberMe(checked as boolean)
                  }
                  className="rounded-md data-[state=checked]:bg-primary"
                />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
                >
                  Remember me on this device
                </label>
              </div>
              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Don&apos;t have an account?{' '}
          <a href="#" className="font-semibold text-primary hover:underline">
            Contact Support
          </a>
        </p>
      </motion.div>
    </div>
  )
}
