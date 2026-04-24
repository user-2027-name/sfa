import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import sql from '@/lib/db';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = (user.email || '').toLowerCase();

      if (!email.endsWith('@ims-hirosaki.com')) {
        return false;
      }

      try {
        const employees = await sql`SELECT id, name FROM employees WHERE LOWER(email) = ${email}`;
        
        if (employees.length > 0) {
          return true;
        } else {
          console.warn('User not found in employees table:', email);
          return false;
        }
      } catch (error) {
        console.error('Auth DB Error:', error);
        return false;
      }
    },
    async session({ session }) {
      if (session.user && session.user.email) {
        const email = session.user.email.toLowerCase();
        const employees = await sql`SELECT id, role FROM employees WHERE LOWER(email) = ${email}`;
        if (employees.length > 0) {
          const employee = employees[0];
          (session.user as any).id = employee.id;
          (session.user as any).role = employee.role;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  // 以前成功したクッキー設定を念のため維持
  cookies: {
    callbackUrl: {
      name: `__Secure-next-auth.callback-url`,
      options: { sameSite: 'lax', path: '/', secure: true }
    },
    csrfToken: {
      name: `__Host-next-auth.csrf-token`,
      options: { sameSite: 'lax', path: '/', secure: true }
    },
    state: {
      name: `__Secure-next-auth.state`,
      options: { sameSite: 'lax', path: '/', secure: true }
    }
  }
});

export { handler as GET, handler as POST };
