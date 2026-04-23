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
      const email = user.email || '';
      if (!email.endsWith('@ims-hirosaki.com')) {
        return false;
      }

      try {
        const employees = await sql`SELECT id FROM employees WHERE email = ${email}`;
        if (employees.length > 0) {
          return true;
        } else {
          console.warn(`Sign-in denied: ${email} not found in employee master.`);
          return false;
        }
      } catch (error) {
        console.error('Auth DB check error:', error);
        return false;
      }
    },
    async session({ session }) {
      if (session.user && session.user.email) {
        const employees = await sql`SELECT id, role FROM employees WHERE email = ${session.user.email}`;
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
});

export { handler as GET, handler as POST };
