import '@fastify/jwt';
import 'fastify';

declare module '@fastify/jwt' {
  export interface FastifyJWT {
    user: {
      id: string;
    };
  }
}

declare module 'fastify' {
  interface FastifyContextConfig {
    skipAuth?: boolean;
  }
}
