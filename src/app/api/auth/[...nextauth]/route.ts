import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

// 超シンプル版：まずはログインができるかだけを確認
const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  // Vercel用の信頼設定
  trustHost: true,
});

export { handler as GET, handler as POST };
