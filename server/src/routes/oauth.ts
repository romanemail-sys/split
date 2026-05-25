import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { generateAccessToken, generateRefreshToken } from '../services/token.service';

const router = Router();

if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET && config.GOOGLE_CALLBACK_URL) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        callbackURL: config.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('No email from Google'));

          let user = await prisma.user.findUnique({ where: { googleId: profile.id } });

          if (!user) {
            user = await prisma.user.findUnique({ where: { email } });
            if (user) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { googleId: profile.id, avatarUrl: user.avatarUrl ?? profile.photos?.[0]?.value },
              });
            } else {
              user = await prisma.user.create({
                data: {
                  name: profile.displayName,
                  email,
                  googleId: profile.id,
                  avatarUrl: profile.photos?.[0]?.value,
                },
              });
            }
          }

          done(null, user);
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
}

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${config.CLIENT_URL}/login?error=oauth`, session: false }),
  (req, res) => {
    const user = req.user as { id: string };
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    // HashRouter needs the hash prefix so the client-side route is matched
    res.redirect(`${config.CLIENT_URL}/#/auth/callback?token=${accessToken}`);
  }
);

export default router;
