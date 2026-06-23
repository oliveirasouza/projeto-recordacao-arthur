import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

const nextAuthResult = NextAuth({
  secret: process.env.AUTH_SECRET || "fallback-secret-for-dev-only-change-in-production",
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "Senha de Acesso",
      credentials: {
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        // Simple local password validation
        const correctPassword = process.env.ADMIN_PASSWORD || "arthur123"
        if (credentials?.password === correctPassword) {
          return {
            id: "seed-user-id",
            name: "Administrador Arthur",
            email: "admin@guerreiroesonhador.com",
            image: "/hero_arthur.png",
          }
        }
        return null
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session?.user && token?.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})

export const handlers: any = nextAuthResult.handlers
export const auth: any = nextAuthResult.auth
export const signIn: any = nextAuthResult.signIn
export const signOut: any = nextAuthResult.signOut
