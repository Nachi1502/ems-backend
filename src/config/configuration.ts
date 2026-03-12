export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'EMS$2026@JWT',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  },
});
