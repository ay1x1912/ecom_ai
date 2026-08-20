import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { env } from './env.js';
import { User } from '../models/index.js';

/**
 * Stateless JWT strategy. The token is only an assertion of "who"; the user's
 * current role and details are always re-read from the database, so a role change
 * or deletion takes effect on the next request rather than when the token expires.
 */
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: env.JWT_SECRET,
    },
    async (payload, done) => {
      try {
        // defaultScope excludes the password, so req.user never carries the hash.
        const user = await User.findByPk(payload.sub);
        if (!user) return done(null, false);
        return done(null, user);
      } catch (err) {
        return done(err, false);
      }
    },
  ),
);

export { passport };
