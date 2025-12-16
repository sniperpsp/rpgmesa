import { SessionOptions } from 'iron-session';

export interface SessionData {
    userId?: string;
    isLoggedIn: boolean;
    user?: {
        id: string;
        email: string;
        name: string;
    };
}

export const sessionOptions: SessionOptions = {
    password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long',
    cookieName: 'rpgmesa_session',
    cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
    },
};
