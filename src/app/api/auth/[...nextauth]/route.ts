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
      console.log('--- Auth Debug ---');
      console.log('Incoming Email:', email);
      
      if (!email.endsWith('@ims-hirosaki.com')) {
        console.warn('Domain mismatch:', email);
        return false;
      }

      try {
        const employees = await sql`SELECT id, name, email FROM employees WHERE LOWER(email) = ${email}`;
        console.log('DB Query Result:', employees);
        
        if (employees.length > 0) {
          console.log('Access Granted for:', employees[0].name);
          return true;
        } else {
          console.warn('Sign-in denied: Email not found in DB table:', email);
          return false;
        }
      } catch (error) {
        console.error('Auth DB check error:', error);
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
});

export { handler as GET, handler as POST };
